## pr-checkbot

> A GitHub App built with [Probot](https://probot.github.io) that renders an intelligent checklist on your pr and uploads it to a changelog.

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
