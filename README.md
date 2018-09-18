## pr-checkbot

> A GitHub App built with [Probot](https://probot.github.io) that renders an intelligent checklist on your pr and uploads it to a changelog.

## How it works

A probot app is just a node.js module that exports a funtion.
The app parameter is an instance of Application as you can see at the top of index.js:

`@param {import('probot').Application} app `

`app` provides access to all ‘Github goodness’, such as webhooks that allow you to subscribe to certain events via Github.com.

Listen for these webhooks via [on](https://probot.github.io/api/latest/classes/application.html#on).

```
  app.on('issues.opened', async context => {
    const issueComment = context.issue({ body: 'Thanks for opening this issue!' });
    return context.github.issues.createComment(issueComment);
  })
```

Here, you can see I am subscribing to issues.opened. When I open an issue on a repo that this github app is installed on via github.com, my function will fire.

Another important piece is context. Context is the context of the event that was triggered, including the payload, github rest api, and a logger.

The github rest api allows you to do pretty much anything you can do via the ui on Github.com. This bot uses it to create and delete comments, commit changes, and interact with various events.

## Assumptions

Any repo you install this bot on is assumed to have a .github directory containing:
- '.github/release_changelog.md' a file that the changelog will be written to
- '.github/PR_CHECKLIST.json', a file that defines the rules for the checkbox. For example:

```
In this case each global rule will be rendered with a checkbox whenever any pr is posted, 
and each controller check will be rendered when the pr modifies a file in the app/controllers directory.

{
  "rules": [
    {
      "pattern": ".*",
      "name": "Global Rules",
      "checks": [
        "Matched style guide?",
        "Have you added any new feature flags?",
        "Adds tests?"
      ]
    },
    {
      "pattern": "app/controllers/.*",
      "name": "Controller Checks",
      "checks": [
        "Have you modified the existing functionality of any action?",
        "Are your changes protected by a feature flag?"
      ]
    },
  ]
}

```

## Setup

Clone the repo locally and then:

## Install dependencies
npm install

## Run the server
`npm start`
or
`LOG_LEVEL=trace npm start` If you are a log person.

## Contributing

If you have suggestions for how pr-checkbot could be improved, or want to report a bug, open an issue! I'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2018 jilucev <jilucev7@gmail.com>
