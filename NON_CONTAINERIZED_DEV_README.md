# Developing on SCP without a Docker container

Developing on SCP without a Docker container, while less robust, opens up some faster development paradigms, including 
live css/js reloading, faster build times, and byebug debugging in rails.

## SETUP
Commands below assume your CPU is Apple Silicon / M1, not Intel.
1. Run `rbenv -v`.  If it is not found, `brew install rbenv`, then `rbenv init` to set up rbenv in your shell, then close terminal and reopen it.
2. Run `ruby -v` to ensure Ruby 3.1.3 is installed on your local machine.  If not, run `rbenv install 3.1.3` (current [as of 2023-01-26](https://github.com/broadinstitute/single_cell_portal_core/pull/1713)) then `rbenv global 3.1.3`.
3. Run `ruby -ropenssl -e 'puts OpenSSL::OPENSSL_VERSION'`.  
  - If it outputs contains "OpenSSL 1.1.1", go to Step 4.  
  - Else, if output contains something like "OpenSSL 3.0.7", install the needed version of OpenSSL, and install Ruby so that it compiles with the needed version of OpenSSL:
     - Run `brew install openssl@1.1`
     - Run `rbenv uninstall 3.1.3`
     - Run `LDFLAGS="-L/opt/homebrew/opt/openssl@1.1/lib" CPPFLAGS="-I/opt/homebrew/opt/openssl@1.1/include" CONFIGURE_OPTS="--with-openssl-dir=$(brew --prefix openssl@1.1)" RUBY_CONFIGURE_OPTS="--with-openssl-dir=$(brew --prefix openssl@1.1)" rbenv install 3.1.3`
     - Run `ruby -v` to ensure Ruby 3.1.3 is installed
4. Run `bundler -v` to ensure Bundler is installed.  If not, `gem install bundler`.
5. Run `node -v` to ensure Node is installed. If not, install via https://nodejs.org/en/download/
6. Run `yarn -v` to ensure Yarn is installed. If not, install via `brew install yarn`
7. `cd` to where you have the `single_cell_portal_core` Git repo checked out.
8. Run `bundle install`
  - That might fail with a message that contains "An error occurred while installing bson_ext"
  - If so, follow steps from https://stackoverflow.com/a/64248633, noting that:
  - The path in that answer won't work if you're using rbenv (as you should) for Ruby version management.  Instead of that path in that StackOverflow answer, use a path like cd /Users/$(whoami)/.rbenv/versions/3.1.3/lib/ruby/gems/3.1.0/gems/bson_ext-1.5.1
9. Run `yarn install`
10. Run `./rails_local_setup.rb` to will write out required variables into an shell env file (using your Broad username 
to determine which `vault` paths to read from).
11. Run the source command the script outputs -- this will export those needed variables into the current shell
12. Add `config/local_ssl/localhost.crt` to your system's trusted certificates. On macOS, you can drag this file into the 
keychain access app, use the "System" keychain, and the "Certificates" category. Then you will likely need to open the 
newly added certificate in the keychain access app and update the "Trust" setting to be "Always Trust" rather than "Use 
System Defaults".
12. Run `rails s`
13. If you're developing JS, for hot module replacement and live reload, in a separate terminal, run `bin/vite dev`
14. If you are working on functionality that involves delayed jobs, like uploading data:
    * In another terminal, run the source command output in step 7
    * run `rails jobs:work`
15. You're all set!  You can now go to https://localhost:3000 and see the website.
16. Confirm you can sign in and upload a file

## REGULAR DEVELOPMENT
Adding `source <<path-to-single-cell-portal-core>>/config/secrets/.source_env.bash` to your .bash_profile will source the 
secrets read from vault to each new shell, saving you the trouble of rerunning the setup process every time you open a 
new shell.  

NOTE: If you ever use the `bin/run_tests.sh` script locally, this will write out and delete any shell env files 
after completion.  You will need to run `./ruby_local_setup.rb` again to repopulate them.

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
