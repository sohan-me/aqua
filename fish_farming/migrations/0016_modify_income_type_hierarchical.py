# Generated manually on 2025-01-27

from django.db import migrations, models
import django.db.models.deletion
import mptt.fields


class Migration(migrations.Migration):

    dependencies = [
        ('fish_farming', '0015_rename_expense_type_name_to_category'),
    ]

    operations = [
        # Step 1: Add new fields
        migrations.AddField(
            model_name='incometype',
            name='user',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='income_types', to='auth.user'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='incometype',
            name='parent',
            field=mptt.fields.TreeForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='fish_farming.incometype'),
        ),
        
        # Step 2: Add MPTT fields
        migrations.AddField(
            model_name='incometype',
            name='level',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='incometype',
            name='lft',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='incometype',
            name='rght',
            field=models.PositiveIntegerField(default=0, editable=False),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='incometype',
            name='tree_id',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
            preserve_default=False,
        ),
        
        # Step 3: Remove old name field
        migrations.RemoveField(
            model_name='incometype',
            name='name',
        ),
        
        # Step 4: Update Meta options
        migrations.AlterModelOptions(
            name='incometype',
            options={'ordering': ['category'], 'verbose_name': 'Income Type', 'verbose_name_plural': 'Income Types'},
        ),
        
        # Step 5: Add unique constraint
        migrations.AlterUniqueTogether(
            name='incometype',
            unique_together={('user', 'category', 'parent')},
        ),
    ]