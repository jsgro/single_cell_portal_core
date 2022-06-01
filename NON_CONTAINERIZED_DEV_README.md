# Developing on SCP without a Docker container

Developing on SCP without a Docker container, while less robust, opens up some faster development paradigms, including live css/js reloading, faster build times, and byebug debugging in rails.

## SETUP

1.  Run `ruby -v` to ensure Ruby 2.6.6 (as of June 2021) is installed on your local machine.  If not, [install rbenv](https://github.com/rbenv/rbenv#installation), (if on MacOS `brew install rbenv`) then `rbenv init` to set up rbenv in your shell. Then close out terminal and reopen and run `rbenv install 2.6.6`.
2.  Run `bundler -v` to ensure Bundler is installed.  If not, `gem install bundler`.
3.  Run `yarn -v` to ensure Yarn is install. If not install yarn via `brew install yarn`
4.  `cd` to where you have the `single_cell_portal_core` Git repo checked out.
5.  Run `bundle install`
6.  Run `yarn install`
7.  Run `ruby rails_local_setup.rb $BROAD_USERNAME`, where $BROAD_USERNAME is a something like eweitz -- this creates a file in config/secrets with commands to export needed environment variables
8.  Run the source command the script outputs -- this will export those needed variables into the current shell
9.  Add config/local_ssl/localhost.crt to your systems trusted certificates (on macOS, you can drag this file into the keychain access app, use the 'System' keychain, and the 'Certificates' category. Then you will likely need to open the newly added certificate in the keychain access app and update the 'Trust' setting to be 'Always Trust' rather than 'Use System Defaults')
10.  Run `rails s`
11.  (optional, for live reload) In a separate terminal, run bin/webpack-dev-server
12. (needed if you are working on functionality that involves delayed jobs).
    * In another terminal, run the source command output in step 7
    * run `rails jobs:work`
13.  You're all set!  You can now go to https://localhost:3000 and see the website.

## REGULAR DEVELOPMENT
Adding `source <<path-to-single-cell-portal-core>>/config/secrets/.source_env.bash` to your .bash_profile will source the secrets read from vault to each new shell, saving you the trouble of rerunning the setup process every time you open a new shell.

## KNOWN ISSUES
1. Developing outside the docker container inherently runs more risk that your code will not work in the docker environment in staging/production.  BE CAREFUL.  If your changes are non-trivial, confirm your changes work in the containerized deploy before committing (ESPECIALLY changes involving package.json and/or the Gemfile)
2. You may experience difficulty toggling back and forth between containerized and non-containerized deployment, as node-sass bindings are OS-specific.  If you see an error like 'No matching version of node-sass found'
   * if this error occurs when trying to deploy in the container, fix it by deleting the `node-modules/node-sass` folder, and then rerunning the load_env_secrets process
   * if the error is when you're trying to run locally, fix it by running `npm rebuild node-sass`

## TROUBLE SHOOTING
1. If the version you specified for Ruby is not the same as the version returned from running `ruby -v`, run `which ruby` to find out what path to Ruby is being used. The path should be something like: `<user>/.rbenv/shims/ruby`. If it is not, try adding `export PATH="$HOME/.rbenv/shims:$PATH"` to your `~/.bash_profile` to point it at the correct path. 
2. If, after adding your certificate as a trusted certificate, `localhost:3000` still claims that the certificate is not trusted you might need to update your system default configuration to "Always Trust". On MacOS this can be done in the keychain access app by clicking on the localhost cert and then in the Trust dropdown choosing "Always Trust".
3. If you need to download Xcode for your rbenv install be aware that it can take a very long time (multiple hours) and if you are a Broad employee it is recommended you download through `selfservice` from BITS.
4. If when trying to run `bundle install` you get an error like `An error occurred while installing bson_ext (1.5.1), and Bundler cannot continue...` you can try `gem install bson_ext -v '1.5.1' --source 'https://rubygems.org/' -- --with-cflags="-Wno-error=implicit-function-declaration"`
