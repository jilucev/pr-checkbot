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

  app.on('pull_request.opened', async context => {
    app.log('pr was opened')
  })

  app.on('pull_request.reopened', async context => {
    app.log('pr was reopened')
  })

  app.on('pull_request.edited', async context => {
    app.log('pr was edited')
  })

  app.on('pull_request.closed', async context => {
    app.log('pr was closed')
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
// Most events also include an "action".
// For example, the issues event has actions of
// assigned, unassigned, labeled, unlabeled, opened, edited, milestoned, demilestoned, closed, and reopened
