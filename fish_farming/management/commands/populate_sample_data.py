from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fish_farming.models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income,
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard
)
from decimal import Decimal
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Populate the database with sample data for fish farming system'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create or get admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
        
        # Create species
        species_data = [
            {'name': 'Tilapia', 'scientific_name': 'Oreochromis niloticus', 'optimal_temp_min': 26, 'optimal_temp_max': 32, 'optimal_ph_min': 6.5, 'optimal_ph_max': 8.5},
            {'name': 'Catfish', 'scientific_name': 'Clarias gariepinus', 'optimal_temp_min': 24, 'optimal_temp_max': 30, 'optimal_ph_min': 6.0, 'optimal_ph_max': 8.0},
            {'name': 'Carp', 'scientific_name': 'Cyprinus carpio', 'optimal_temp_min': 20, 'optimal_temp_max': 28, 'optimal_ph_min': 6.5, 'optimal_ph_max': 8.5},
        ]
        
        species_objects = []
        for data in species_data:
            species, created = Species.objects.get_or_create(name=data['name'], defaults=data)
            species_objects.append(species)
            if created:
                self.stdout.write(f'Created species: {species.name}')
        
        # Create ponds
        pond_data = [
            {'name': 'Pond A', 'area_sqm': Decimal('100.00'), 'depth_m': Decimal('1.5'), 'location': 'North Section'},
            {'name': 'Pond B', 'area_sqm': Decimal('150.00'), 'depth_m': Decimal('2.0'), 'location': 'South Section'},
            {'name': 'Pond C', 'area_sqm': Decimal('200.00'), 'depth_m': Decimal('1.8'), 'location': 'East Section'},
        ]
        
        pond_objects = []
        for data in pond_data:
            pond, created = Pond.objects.get_or_create(
                name=data['name'], 
                user=admin_user, 
                defaults=data
            )
            pond_objects.append(pond)
            if created:
                self.stdout.write(f'Created pond: {pond.name}')
        
        # Create feed types
        feed_type_data = [
            {'name': 'Starter Feed', 'protein_content': Decimal('45.0'), 'description': 'High protein feed for fingerlings'},
            {'name': 'Grower Feed', 'protein_content': Decimal('35.0'), 'description': 'Medium protein feed for growing fish'},
            {'name': 'Finisher Feed', 'protein_content': Decimal('28.0'), 'description': 'Lower protein feed for market size fish'},
        ]
        
        feed_type_objects = []
        for data in feed_type_data:
            feed_type, created = FeedType.objects.get_or_create(name=data['name'], defaults=data)
            feed_type_objects.append(feed_type)
            if created:
                self.stdout.write(f'Created feed type: {feed_type.name}')
        
        # Create expense types
        expense_type_data = [
            {'name': 'Feed Purchase', 'category': 'feed'},
            {'name': 'Medicine', 'category': 'medicine'},
            {'name': 'Equipment', 'category': 'equipment'},
            {'name': 'Labor', 'category': 'labor'},
            {'name': 'Electricity', 'category': 'utilities'},
            {'name': 'Maintenance', 'category': 'maintenance'},
        ]
        
        expense_type_objects = []
        for data in expense_type_data:
            expense_type, created = ExpenseType.objects.get_or_create(name=data['name'], defaults=data)
            expense_type_objects.append(expense_type)
            if created:
                self.stdout.write(f'Created expense type: {expense_type.name}')
        
        # Create income types
        income_type_data = [
            {'name': 'Fish Sales', 'category': 'harvest'},
            {'name': 'Fingerling Sales', 'category': 'seedling'},
            {'name': 'Consulting', 'category': 'consulting'},
        ]
        
        income_type_objects = []
        for data in income_type_data:
            income_type, created = IncomeType.objects.get_or_create(name=data['name'], defaults=data)
            income_type_objects.append(income_type)
            if created:
                self.stdout.write(f'Created income type: {income_type.name}')
        
        # Create feeding bands
        feeding_band_data = [
            {'name': 'Fingerling', 'min_weight_g': Decimal('1.0'), 'max_weight_g': Decimal('10.0'), 'feeding_rate_percent': Decimal('12.0'), 'frequency_per_day': 4},
            {'name': 'Juvenile', 'min_weight_g': Decimal('10.0'), 'max_weight_g': Decimal('50.0'), 'feeding_rate_percent': Decimal('8.0'), 'frequency_per_day': 3},
            {'name': 'Grower', 'min_weight_g': Decimal('50.0'), 'max_weight_g': Decimal('200.0'), 'feeding_rate_percent': Decimal('5.0'), 'frequency_per_day': 2},
            {'name': 'Market', 'min_weight_g': Decimal('200.0'), 'max_weight_g': Decimal('1000.0'), 'feeding_rate_percent': Decimal('3.0'), 'frequency_per_day': 2},
        ]
        
        for data in feeding_band_data:
            feeding_band, created = FeedingBand.objects.get_or_create(name=data['name'], defaults=data)
            if created:
                self.stdout.write(f'Created feeding band: {feeding_band.name}')
        
        # Create sample stockings based on the sheet data
        stocking_data = [
            {'pond': pond_objects[0], 'species': species_objects[0], 'date': date(2025, 7, 14), 'pcs': 59000, 'line_pcs_per_kg': Decimal('14.41'), 'initial_avg_g': Decimal('0.017')},
            {'pond': pond_objects[1], 'species': species_objects[0], 'date': date(2025, 4, 23), 'pcs': 125000, 'line_pcs_per_kg': Decimal('3000'), 'initial_avg_g': Decimal('0.333')},
            {'pond': pond_objects[2], 'species': species_objects[0], 'date': date(2025, 6, 18), 'pcs': 122000, 'line_pcs_per_kg': Decimal('35'), 'initial_avg_g': Decimal('28.571')},
            {'pond': pond_objects[0], 'species': species_objects[1], 'date': date(2025, 6, 7), 'pcs': 223000, 'line_pcs_per_kg': Decimal('57'), 'initial_avg_g': Decimal('17.544')},
        ]
        
        for data in stocking_data:
            stocking, created = Stocking.objects.get_or_create(
                pond=data['pond'], 
                species=data['species'], 
                date=data['date'], 
                defaults=data
            )
            if created:
                self.stdout.write(f'Created stocking: {stocking}')
        
        # Create sample daily logs
        for pond in pond_objects:
            for i in range(7):  # Last 7 days
                log_date = date.today() - timedelta(days=i)
                daily_log, created = DailyLog.objects.get_or_create(
                    pond=pond,
                    date=log_date,
                    defaults={
                        'weather': random.choice(['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy']),
                        'water_temp_c': Decimal(str(random.uniform(24, 32))),
                        'ph': Decimal(str(random.uniform(6.5, 8.5))),
                        'dissolved_oxygen': Decimal(str(random.uniform(4, 8))),
                        'ammonia': Decimal(str(random.uniform(0, 0.5))),
                        'nitrite': Decimal(str(random.uniform(0, 0.2))),
                        'notes': f'Sample daily log for {log_date}'
                    }
                )
                if created:
                    self.stdout.write(f'Created daily log: {daily_log}')
        
        # Create sample expenses
        for i in range(20):
            expense_date = date.today() - timedelta(days=random.randint(0, 30))
            expense, created = Expense.objects.get_or_create(
                user=admin_user,
                pond=random.choice(pond_objects),
                expense_type=random.choice(expense_type_objects),
                date=expense_date,
                defaults={
                    'amount': Decimal(str(random.uniform(50, 500))),
                    'quantity': Decimal(str(random.uniform(1, 100))),
                    'unit': random.choice(['kg', 'pieces', 'hours', 'liters']),
                    'supplier': f'Supplier {random.randint(1, 5)}',
                    'notes': f'Sample expense {i+1}'
                }
            )
            if created:
                self.stdout.write(f'Created expense: {expense}')
        
        # Create sample incomes
        for i in range(10):
            income_date = date.today() - timedelta(days=random.randint(0, 30))
            income, created = Income.objects.get_or_create(
                user=admin_user,
                pond=random.choice(pond_objects),
                income_type=random.choice(income_type_objects),
                date=income_date,
                defaults={
                    'amount': Decimal(str(random.uniform(200, 2000))),
                    'quantity': Decimal(str(random.uniform(10, 500))),
                    'unit': random.choice(['kg', 'pieces']),
                    'customer': f'Customer {random.randint(1, 3)}',
                    'notes': f'Sample income {i+1}'
                }
            )
            if created:
                self.stdout.write(f'Created income: {income}')
        
        # Create sample alerts
        alert_data = [
            {'pond': pond_objects[0], 'alert_type': 'Low Oxygen', 'severity': 'high', 'message': 'Dissolved oxygen levels are critically low'},
            {'pond': pond_objects[1], 'alert_type': 'High Ammonia', 'severity': 'medium', 'message': 'Ammonia levels are elevated'},
            {'pond': pond_objects[2], 'alert_type': 'Temperature Warning', 'severity': 'low', 'message': 'Water temperature is outside optimal range'},
        ]
        
        for data in alert_data:
            alert, created = Alert.objects.get_or_create(
                pond=data['pond'],
                alert_type=data['alert_type'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created alert: {alert}')
        
        self.stdout.write(
            self.style.SUCCESS('Successfully populated database with sample data!')
        )
