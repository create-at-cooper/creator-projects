creator projects
==========
A directory for projects. Created for [create@cooper](http://createatcooper.org) for students at [The Cooper Union](http://cooper.edu). Check it out at [projects.createatcooper.org](http://projects.createatcooper.org). Note that authentication is done with Cooper Union servers.

Setup
-----
First, set up [django](https://www.djangoproject.com/) and install the modules in `requirements.txt`. Then run
```
$ python manage.py syncdb
```
follow the instructions to create a user, and then run
```
$ python manage.py runserver
```
then visit `localhost:8000` in your browser.

Production
----------
Set `LOCAL_DEV` to `False` for production settings. Postgres is the default database with the url at `postgres://localhost`.

To run this in a more professional manner, set up an [Amazon S3 bucket](http://aws.amazon.com/s3/) and in your environment variables, set your `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_STORAGE_BUCKET_NAME`.
