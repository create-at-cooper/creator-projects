'''
Created on Oct 25, 2012

@author: Eric
'''
from django.contrib.auth.models import User
from imaplib import IMAP4_SSL

class IMAPBackend:

    # Create an authentication method
    # This is called by the standard Django login procedure
    def authenticate(self, username=None, password=None):
        if '@' in username:
            username = username[:username.find('@')]
        
        try:
            # Check if this user is valid on the mail server
            c = IMAP4_SSL('farley2.cooper.edu')
            c.login(username, password)
            c.logout()
        except:
            return None

        try:
            # Check if the user exists in Django's local database
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Create a user in Django's local database
            user = User.objects.create_user(username, username + '@cooper.edu', 'password')

        return user

    # Required for your backend to work properly - unchanged in most scenarios
    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None