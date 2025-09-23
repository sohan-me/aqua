# Generated manually on 2025-01-27

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('fish_farming', '0013_modify_expense_type_hierarchical'),
    ]

    operations = [
        # Simply rename the field from name to category
        migrations.RenameField(
            model_name='expensetype',
            old_name='name',
            new_name='category',
        ),
        
        # Update unique constraint
        migrations.AlterUniqueTogether(
            name='expensetype',
            unique_together={('user', 'category', 'parent')},
        ),
        
        # Update ordering
        migrations.AlterModelOptions(
            name='expensetype',
            options={'ordering': ['category'], 'verbose_name': 'Expense Type', 'verbose_name_plural': 'Expense Types'},
        ),
    ]
