# Generated manually on 2025-01-27

from django.db import migrations, models
import django.db.models.deletion
import mptt.fields


class Migration(migrations.Migration):

    dependencies = [
        ('fish_farming', '0012_remove_vendor_categories'),
    ]

    operations = [
        # Step 1: Add new fields first
        migrations.AddField(
            model_name='expensetype',
            name='user',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='expense_types', to='auth.user'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='expensetype',
            name='parent',
            field=mptt.fields.TreeForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='fish_farming.expensetype'),
        ),
        
        # Step 2: Add MPTT fields
        migrations.AddField(
            model_name='expensetype',
            name='level',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='expensetype',
            name='lft',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='expensetype',
            name='rght',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='expensetype',
            name='tree_id',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
            preserve_default=False,
        ),
        
        # Step 3: Remove old fields
        migrations.RemoveField(
            model_name='expensetype',
            name='category',
        ),
        
        # Step 4: Update Meta options
        migrations.AlterModelOptions(
            name='expensetype',
            options={'ordering': ['name'], 'verbose_name': 'Expense Type', 'verbose_name_plural': 'Expense Types'},
        ),
        
        # Step 5: Add unique constraint
        migrations.AlterUniqueTogether(
            name='expensetype',
            unique_together={('user', 'name', 'parent')},
        ),
    ]
