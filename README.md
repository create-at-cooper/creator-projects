creator projects
==========
A directory for projects. Created for [create@cooper](http://createatcooper.org) for students at [The Cooper Union](http://cooper.edu). Check it out at [projects.createatcooper.org](http://projects.createatcooper.org). Note that authentication is done with Cooper Union servers.

Setup
-----
After you set up [django](https://www.djangoproject.com/) and install the modules in `requirements.txt`, run
```
$ python manage.py syncdb
```
follow the instructions to create a user, and then run
```
$ python manage.py runserver
```
then visit `localhost:8000` in your browser.
