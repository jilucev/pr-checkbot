// LOG_LEVEL=trace npm start
// app.log('Hodor, app log');
// app.log.debug({data: 'here'}, 'Debugging with app log');
/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */
 // The context object includes everything about the event that was triggered, and context.payload has the payload delivered by GitHub.
module.exports = app => {

  app.log('Yay, the app was loaded!');

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' });
    return context.github.issues.createComment(issueComment);
  })

  //cleans up the comments when the pr is deleted
  // assigned, unassigned, labeled, unlabeled, opened, edited, closed, reopened, or synchronized
  app.on('pull_request.closed', async context => {
    const params = context.issue();
    const {owner, repo, number} = params;

    // context.github is an instance of the @octokit/rest Node.js module,
    // which wraps the GitHub REST API and allows you to do almost anything programmatically that you can do through a web browser.
    const comments = await context.github.issues.getComments({owner, repo, number});

    return comments.data.forEach(comment => context.github.issues.deleteComment({owner, repo, comment_id: comment.id}));
  })

  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.edited'], async context => {
    // Return the owner, repo, and number params for making API requests against an issue or pull request.
    // The object passed in will be merged with the repo params.
    const params = context.issue();
    const {owner, repo, number} = params;

    const rulesFile = await context.github.repos.getContent({owner, repo, path: '.github/PR_CHECKLIST.json'});
    const rules = JSON.parse(Buffer.from(rulesFile.data.content, 'base64').toString()).rules;

    const files = (await context.github.pullRequests.getFiles({owner, repo, number})).data.map(_ => _.filename);

    const matchingRules = rules.filter(rule => {
      const regexp = new RegExp(rule.pattern);

      return files.some(file => regexp.test(file));
    });

   const messages = [ '# Code Review Checklist' ];

   matchingRules.forEach(rule => {
     messages.push('## ' + rule.name);

     rule.checks.forEach(check => messages.push(`- [ ] ${check}`));
   });

    const prComment = context.issue({ body: messages.join('\n')});

    await context.github.issues.createComment(prComment);

    const sha = context.payload.pull_request.head.sha;

    return context.github.repos
      .createStatus({ owner, repo, sha, state: 'pending', context: 'Code Review', description: 'Checklist' });
  })

  async function updateChangeLog(context, checklist) {
    const {owner, repo, number} = context.issue();

    // TODO append to TOP of file with info about commit
    // get all commits first and extract info about last commit
    // add that info to changelogFileContents
    
    const changelogFile = await context.github.repos.getContent({owner, repo, path: '.github/release_changelog.md'});
    const changelogFileContents = Buffer.from(changelogFile.data.content, 'base64').toString();

    const content = Buffer.from(owner + '/n' + number + '/n' + checklist + '/n' + changelogFileContents).toString('base64');

    const updatefile = await context.github.repos.updateFile(
      {
        owner: owner,
        repo: repo,
        path: '.github/release_changelog.md',
        message: "This is a pony changelog",
        content: content,
        sha: changelogFile.data.sha
      }
    );

    const allCommits = await context.github.repos.getCommits({owner, repo});
    const rootSha = allCommits.data[0].sha;

    const commitParams = {
      owner,
      repo,
      message: 'Ponyfriends test',
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

        const message = [];
        const image = `!['I like what you did there'](https://media.giphy.com/media/10PixLlze8fYiI/giphy.gif "I like what you did there")`

        message.push(`# Go for it.`);
        message.push(image);

        const params = context.issue({body: message.join('')});

        if (checklistComplete) {
          //also need to update the file and commit
          updateChangeLog(context, body);
          context.github.issues.createComment(params);
        } else {
          // Remove the gif if the checklist is no longer complete
          const comments = await context.github.issues.getComments({owner, repo, number});
          const gifComments = comments.data.filter(comment => comment.body.includes(`Go for it.`))

          return gifComments.forEach(gifComment => context.github.issues.deleteComment({owner, repo, comment_id: gifComment.id}));
        }

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
      }
    }
  });
}
