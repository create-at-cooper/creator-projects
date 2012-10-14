from django.db import models
from django.db.models.fields.files import ImageField

class Test(models.Model):
    question = models.CharField(max_length=140, default="Pick one!")
    pub_date = models.DateTimeField('date published', auto_now_add=True)
    
class Choice(models.Model):
    test = models.ForeignKey(Test, related_name='choices')
    votes = models.IntegerField(default=0)
    image = ImageField(upload_to="choices")