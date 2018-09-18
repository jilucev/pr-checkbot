// LOG_LEVEL=trace npm start
// app.log.debug({data: 'here'}, 'Debugging with app log');
//https://octokit.github.io/rest.js/
/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */
 // This app exports only one thing, a Node.js module that is an instance of Probot's Application class.
module.exports = app => {

  app.log('Yay, the app was loaded!');
  // app provides an interface for on, which allows me to listen for github webhooks.
  // when a user opens an issue via the Github.com UI, this webhook will fire and call this function.
  // context is the context of the event that was triggered.
  // it includes the payload(context.payload), the Github rest api(context.github), and a logger(context.logger).
  // The github rest api allows you to do pretty much anything you can do via the ui on Github.com,
  // here, I am creating a comment on this PR.
  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' });
    return context.github.issues.createComment(issueComment);
  })

  // cleans up the comments when the pr is deleted
  // If the pull request is closed because it's just been merged,
  // Gets the merge commit and checklist body and feeds them to updateChangeLog
  app.on('pull_request.closed', async context => {
    app.log(`pull request was closed`);
    const params = context.issue();
    const {owner, repo, number} = params;

    const comments = await context.github.issues.getComments({owner, repo, number});
    const checklistComment = comments.data.filter(comment => comment.body.includes(`# Code Review Checklist`));
    const checklistBody = checklistComment[0].body;
    const checklistParams = context.issue({ body: checklistBody});

    //Get merge commit and use data in changelog
    let mergeCommit;

    const mergeCheck = await context.github.pullRequests.checkMerged({owner, repo, number}).catch(e => app.log(` Error with merge check ${e}`));

    if(mergeCheck.status == 204) {
      app.log('was merged!')

      const events = (await context.github.activity.getEventsForRepo({owner, repo}).then(events => {
        mergeCommit = events.data[0].payload.commits.pop();
        app.log(`merge commit ${JSON.stringify(mergeCommit, null, 4)}`);
      }));

      updateChangeLog(context, checklistBody, mergeCommit);
      context.github.issues.createComment(checklistParams);
    }

    // context.github is an instance of the @octokit/rest Node.js module,
    // which wraps the GitHub REST API and allows you to do almost anything programmatically that you can do through a web browser.
    comments.data.forEach(comment => context.github.issues.deleteComment({owner, repo, comment_id: comment.id}));
  })

  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.edited'], async context => {
    const params = context.issue();
    const {owner, repo, number} = params;

    //Load the checklist rules from the repo. Must be located at '.github/PR_CHECKLIST.json'
    const rulesFile = await context.github.repos.getContent({owner, repo, path: '.github/PR_CHECKLIST.json'});
    const rules = JSON.parse(Buffer.from(rulesFile.data.content, 'base64').toString()).rules;

    const files = (await context.github.pullRequests.getFiles({owner, repo, number})).data.map(_ => _.filename);

    const matchingRules = rules.filter(rule => {
      const regexp = new RegExp(rule.pattern);

      return files.some(file => regexp.test(file));
    });

   const messages = [ '# Code Review Checklist' ];

   //Use the rules file to build the checklist
   matchingRules.forEach(rule => {
     messages.push('## ' + rule.name);

     rule.checks.forEach(check => messages.push(`- [ ] ${check}`));
   });

    const prComment = context.issue({ body: messages.join('\n')});

    await context.github.issues.createComment(prComment);

    const sha = context.payload.pull_request.head.sha;

    // Add the checklist as a comment on the PR
    return context.github.repos
      .createStatus({ owner, repo, sha, state: 'pending', context: 'Code Review', description: 'Checklist' });
  })

  // Build the new changelog content and commit it to the repo's changelog. Must be located at '.github/release_changelog.md'
  async function updateChangeLog(context, checklist, mergeCommit) {
    app.log(`checklist in updateChangeLog ${checklist}`);
    const {owner, repo, number} = context.issue();

    const allCommits = await context.github.repos.getCommits({owner, repo});
    const lastCommit = allCommits.data[0];
    const rootSha = lastCommit.sha;

    const authorInfo = lastCommit.commit.author;
    const mergeCommitMessage = lastCommit.message || 'no message present on merge commit';

    const changelogFile = await context.github.repos.getContent({owner, repo, path: '.github/release_changelog.md'});
    const changelogFileContents = Buffer.from(changelogFile.data.content, 'base64').toString();

    let info = [
      ` ${'='.repeat(80)} `,
      ` ${mergeCommit.author.email} `,
      ` ${mergeCommit.message} `,
      ` ${mergeCommit.sha}`,
      checklist,
      changelogFileContents,
      ` ${'='.repeat(80)} `
    ].join('\n');

    const content = Buffer.from(info).toString('base64');

    const updatefile = await context.github.repos.updateFile(
      {
        owner: owner,
        repo: repo,
        path: '.github/release_changelog.md',
        message: mergeCommit.message,
        content: content,
        sha: changelogFile.data.sha
      }
    );

    const commitParams = {
      owner,
      repo,
      message: mergeCommit.message,
      tree: rootSha
    }

    const result = await context.github.gitdata.createCommit(commitParams)
  }

  app.on('issue_comment', async context => {

    if (context.payload.action === 'edited') {
      const body = context.payload.comment.body;

      if (body.includes('Code Review Checklist')) {
        const {owner, repo, number} = context.issue();

        const checklistComplete = !body.includes('[ ]');

        if (checklistComplete) {

          app.log('checklist complete');
          const message = [];
          const image = `!['I like what you did there'](https://media.giphy.com/media/10PixLlze8fYiI/giphy.gif "I like what you did there")`

          message.push(`# Go for it.`);
          message.push(image);
          const params = context.issue({body: message.join('')});
          context.github.issues.createComment(params);

          // Set the checklist status to green
          const pr = await context.github.pullRequests.get({owner, repo, number});
          const sha = pr.data.head.sha;
          context.github.repos.createStatus({
            owner,
            repo,
            sha,
            state: checklistComplete ? 'success' : 'pending',
            context: 'Code Review',
            description: 'Checklist'
          });

        } else {
          // Remove the gif if the checklist is no longer complete
          const comments = await context.github.issues.getComments({owner, repo, number});
          const gifComments = comments.data.filter(comment => comment.body.includes(`Go for it.`))

          return gifComments.forEach(gifComment => context.github.issues.deleteComment({owner, repo, comment_id: gifComment.id}));
        }
      }
    }
  });
}
