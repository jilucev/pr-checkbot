/**
 * This is the entry point for your Probot App.
 * @param {import('probot').Application} app - Probot's Application class.
 */
module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    return context.github.issues.createComment(issueComment)
  })

  app.on(['pull_request.opened', 'pull_request.reopened'], async context => {
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
  });

  app.on('pull_request.edited', async context => {
    app.log('pr was edited')
  });

  app.on('pull_request.closed', async context => {
    app.log('pr was closed')
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
// Most events also include an "action".
// For example, the issues event has actions of
// assigned, unassigned, labeled, unlabeled, opened, edited, milestoned, demilestoned, closed, and reopened
