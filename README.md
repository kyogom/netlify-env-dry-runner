# netlify-env-dry-runner

## Requirement

[netlify cli](https://cli.netlify.com/)

## Description

Using this cli tool, you can compare the environment variables set in the Netlify application with those written in the .env format file in the repository, and display the differences in the standard output. In other words, if there are environment variables that are only set in one of them, it will show the difference in the standard output.

## Setup

`npm install netlify-env-dry-runner`  
`netlify login`

## Usage

`netlify-env-dry-runner <site-name> <config-path>`

For example:

```
netlify login
netlify-env-dry-runner todo-service-production /Users/kyogom/dev/private/todo-service/prod.env

+ VITE_OGP_IMG=https://manage-expense-assets.s3.ap-northeast-1.amazonaws.com/ogp.png

! VITE_SITE_TITLE=todo-service-prod1
! VITE_SITE_TITLE=todo-service-prod2


```

`+` : adding environment variable  
`-` : removing environment variable  
`!` : changing environment variable
