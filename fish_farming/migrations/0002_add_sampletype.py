# Generated manually

from django.db import migrations, models
import django.db.models.deletion


def create_sample_types(apps, schema_editor):
    """Create default sample types"""
    SampleType = apps.get_model('fish_farming', 'SampleType')
    
    sample_types = [
        {'name': 'water', 'description': 'Water Sample', 'icon': 'droplets', 'color': 'blue'},
        {'name': 'fish', 'description': 'Fish Sample', 'icon': 'fish', 'color': 'green'},
        {'name': 'sediment', 'description': 'Sediment Sample', 'icon': 'test-tube', 'color': 'orange'},
    ]
    
    for sample_type_data in sample_types:
        SampleType.objects.get_or_create(
            name=sample_type_data['name'],
            defaults=sample_type_data
        )


def migrate_sampling_data(apps, schema_editor):
    """Migrate existing sampling data to use SampleType foreign key"""
    Sampling = apps.get_model('fish_farming', 'Sampling')
    SampleType = apps.get_model('fish_farming', 'SampleType')
    
    # Update existing sampling records
    for sampling in Sampling.objects.all():
        sample_type = SampleType.objects.get(name=sampling.sample_type)
        sampling.sample_type_new = sample_type
        sampling.save()


def reverse_migrate_sampling_data(apps, schema_editor):
    """Reverse migration - convert back to string"""
    Sampling = apps.get_model('fish_farming', 'Sampling')
    
    for sampling in Sampling.objects.all():
        if hasattr(sampling, 'sample_type_new') and sampling.sample_type_new:
            sampling.sample_type = sampling.sample_type_new.name
            sampling.save()


class Migration(migrations.Migration):

    dependencies = [
        ('fish_farming', '0001_initial'),
    ]

    operations = [
        # Create SampleType model
        migrations.CreateModel(
            name='SampleType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('icon', models.CharField(default='test-tube', help_text='Icon name for UI display', max_length=50)),
                ('color', models.CharField(default='blue', help_text='Color theme for UI display', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Sample Type',
                'verbose_name_plural': 'Sample Types',
                'ordering': ['name'],
            },
        ),
        
        # Create sample types
        migrations.RunPython(create_sample_types, reverse_code=migrations.RunPython.noop),
        
        # Add new foreign key field to Sampling
        migrations.AddField(
            model_name='sampling',
            name='sample_type_new',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='samplings_new', to='fish_farming.sampletype'),
        ),
        
        # Migrate data
        migrations.RunPython(migrate_sampling_data, reverse_migrate_sampling_data),
        
        # Remove old field and rename new field
        migrations.RemoveField(
            model_name='sampling',
            name='sample_type',
        ),
        migrations.RenameField(
            model_name='sampling',
            old_name='sample_type_new',
            new_name='sample_type',
        ),
        
        # Make the field non-nullable
        migrations.AlterField(
            model_name='sampling',
            name='sample_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='samplings', to='fish_farming.sampletype'),
        ),
    ]
