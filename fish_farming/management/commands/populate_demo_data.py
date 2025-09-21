from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

from fish_farming.models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, 
    Sampling, Mortality, Harvest, ExpenseType, IncomeType, Expense, 
    Income, FishSampling, FeedingAdvice, FeedingBand, EnvAdjustment
)


class Command(BaseCommand):
    help = 'Populate database with comprehensive demo data for testing all functionality'

    def handle(self, *args, **options):
        self.stdout.write('Starting demo data population...')
        
        # Create superuser
        self.create_superuser()
        
        # Create basic data
        self.create_basic_data()
        
        # Create ponds
        self.create_ponds()
        
        # Create species
        self.create_species()
        
        # Create feed types
        self.create_feed_types()
        
        # Create sample types
        self.create_sample_types()
        
        # Create expense and income types
        self.create_expense_income_types()
        
        # Create feeding bands
        self.create_feeding_bands()
        
        # Create environmental adjustments
        self.create_env_adjustments()
        
        # Create operational data
        self.create_operational_data()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully populated database with demo data!')
        )

    def create_superuser(self):
        """Create a demo superuser"""
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@demo.com',
                password='admin123'
            )
            self.stdout.write('Created admin user (username: admin, password: admin123)')
        
        if not User.objects.filter(username='farmer').exists():
            User.objects.create_user(
                username='farmer',
                email='farmer@demo.com',
                password='farmer123'
            )
            self.stdout.write('Created farmer user (username: farmer, password: farmer123)')

    def create_basic_data(self):
        """Create basic reference data"""
        self.stdout.write('Creating basic reference data...')

    def create_ponds(self):
        """Create demo ponds"""
        self.stdout.write('Creating demo ponds...')
        
        ponds_data = [
            {
                'name': 'Pond A - Main Production',
                'location': 'North Section',
                'area_decimal': Decimal('2.5'),
                'depth_ft': Decimal('4.0'),
                'volume_m3': Decimal('300.0'),
                'is_active': True
            },
            {
                'name': 'Pond B - Nursery',
                'location': 'South Section', 
                'area_decimal': Decimal('1.0'),
                'depth_ft': Decimal('3.0'),
                'volume_m3': Decimal('90.0'),
                'is_active': True
            },
            {
                'name': 'Pond C - Grow-out',
                'location': 'East Section',
                'area_decimal': Decimal('3.0'),
                'depth_ft': Decimal('4.5'),
                'volume_m3': Decimal('400.0'),
                'is_active': True
            },
            {
                'name': 'Pond D - Quarantine',
                'location': 'West Section',
                'area_decimal': Decimal('0.5'),
                'depth_ft': Decimal('2.5'),
                'volume_m3': Decimal('40.0'),
                'is_active': False
            }
        ]
        
        user = User.objects.get(username='farmer')
        for pond_data in ponds_data:
            pond_data['user'] = user
            Pond.objects.create(**pond_data)

    def create_species(self):
        """Create demo fish species"""
        self.stdout.write('Creating demo species...')
        
        species_data = [
            {
                'name': 'Nile Tilapia',
                'scientific_name': 'Oreochromis niloticus',
                'description': 'Fast-growing freshwater fish, excellent for aquaculture',
                'optimal_temp_min': Decimal('22.0'),
                'optimal_temp_max': Decimal('30.0'),
                'optimal_ph_min': Decimal('6.5'),
                'optimal_ph_max': Decimal('8.5')
            },
            {
                'name': 'Catfish',
                'scientific_name': 'Clarias gariepinus',
                'description': 'Hardy bottom-feeding fish, good for intensive farming',
                'optimal_temp_min': Decimal('20.0'),
                'optimal_temp_max': Decimal('28.0'),
                'optimal_ph_min': Decimal('6.0'),
                'optimal_ph_max': Decimal('8.0')
            },
            {
                'name': 'Rohu',
                'scientific_name': 'Labeo rohita',
                'description': 'Popular carp species in South Asia',
                'optimal_temp_min': Decimal('18.0'),
                'optimal_temp_max': Decimal('32.0'),
                'optimal_ph_min': Decimal('6.5'),
                'optimal_ph_max': Decimal('8.5')
            }
        ]
        
        for species_data in species_data:
            Species.objects.create(**species_data)

    def create_feed_types(self):
        """Create demo feed types"""
        self.stdout.write('Creating demo feed types...')
        
        feed_types_data = [
            {
                'name': 'Starter Feed',
                'protein_content': Decimal('40.0'),
                'description': 'High protein feed for fingerlings (0-10g)'
            },
            {
                'name': 'Grower Feed',
                'protein_content': Decimal('32.0'),
                'description': 'Balanced feed for growing fish (10-200g)'
            },
            {
                'name': 'Finisher Feed',
                'protein_content': Decimal('28.0'),
                'description': 'Economical feed for market size fish (200g+)'
            }
        ]
        
        for feed_type_data in feed_types_data:
            FeedType.objects.create(**feed_type_data)

    def create_sample_types(self):
        """Create demo sample types"""
        self.stdout.write('Creating demo sample types...')
        
        sample_types_data = [
            {'name': 'Water Quality', 'description': 'Water quality parameters'},
            {'name': 'Fish Sampling', 'description': 'Fish growth and health sampling'},
            {'name': 'Feed Analysis', 'description': 'Feed quality analysis'},
            {'name': 'Soil Analysis', 'description': 'Pond bottom soil analysis'}
        ]
        
        for sample_type_data in sample_types_data:
            SampleType.objects.create(**sample_type_data)

    def create_expense_income_types(self):
        """Create demo expense and income types"""
        self.stdout.write('Creating demo expense and income types...')
        
        expense_types_data = [
            {'name': 'Feed', 'description': 'Fish feed expenses'},
            {'name': 'Medicine', 'description': 'Veterinary and medicine costs'},
            {'name': 'Labor', 'description': 'Labor and wages'},
            {'name': 'Equipment', 'description': 'Equipment and tools'},
            {'name': 'Utilities', 'description': 'Electricity, water, etc.'},
            {'name': 'Maintenance', 'description': 'Pond and equipment maintenance'},
            {'name': 'Transportation', 'description': 'Transport and logistics'},
            {'name': 'Other', 'description': 'Miscellaneous expenses'}
        ]
        
        income_types_data = [
            {'name': 'Fish Sales', 'description': 'Revenue from fish sales'},
            {'name': 'Fingerling Sales', 'description': 'Revenue from fingerling sales'},
            {'name': 'Consulting', 'description': 'Consulting services'},
            {'name': 'Other', 'description': 'Other income sources'}
        ]
        
        for expense_type_data in expense_types_data:
            ExpenseType.objects.create(**expense_type_data)
            
        for income_type_data in income_types_data:
            IncomeType.objects.create(**income_type_data)

    def create_feeding_bands(self):
        """Create demo feeding bands"""
        self.stdout.write('Creating demo feeding bands...')
        
        feeding_bands_data = [
            {
                'name': 'Fry Stage',
                'min_weight_g': 0,
                'max_weight_g': 10,
                'feeding_rate_percent': Decimal('8.0'),
                'frequency_per_day': 4,
                'notes': 'High protein feed for fingerlings (0-10g)'
            },
            {
                'name': 'Fingerling Stage',
                'min_weight_g': 10,
                'max_weight_g': 50,
                'feeding_rate_percent': Decimal('6.0'),
                'frequency_per_day': 3,
                'notes': 'Balanced feed for growing fish (10-50g)'
            },
            {
                'name': 'Juvenile Stage',
                'min_weight_g': 50,
                'max_weight_g': 200,
                'feeding_rate_percent': Decimal('4.0'),
                'frequency_per_day': 2,
                'notes': 'Standard feed for juvenile fish (50-200g)'
            },
            {
                'name': 'Grow-out Stage',
                'min_weight_g': 200,
                'max_weight_g': 1000,
                'feeding_rate_percent': Decimal('3.0'),
                'frequency_per_day': 2,
                'notes': 'Economical feed for market size fish (200g+)'
            }
        ]
        
        for band_data in feeding_bands_data:
            FeedingBand.objects.create(**band_data)

    def create_env_adjustments(self):
        """Create demo environmental adjustments"""
        self.stdout.write('Creating demo environmental adjustments...')
        
        user = User.objects.get(username='farmer')
        ponds = list(Pond.objects.filter(is_active=True))
        
        for pond in ponds:
            # Create a few environmental adjustments for each pond
            for i in range(3):
                adj_date = date.today() - timedelta(days=i * 10)
                EnvAdjustment.objects.create(
                    pond=pond,
                    date=adj_date,
                    adjustment_type=random.choice(['water_change', 'ph_adjustment', 'aeration']),
                    amount=Decimal(str(random.uniform(10, 50))),
                    unit='%',
                    reason=f'Regular maintenance for {pond.name}',
                    notes=f'Environmental adjustment for pond health'
                )

    def create_operational_data(self):
        """Create operational data (stocking, feeding, sampling, etc.)"""
        self.stdout.write('Creating operational data...')
        
        user = User.objects.get(username='farmer')
        ponds = list(Pond.objects.filter(is_active=True))
        species = list(Species.objects.all())
        feed_types = list(FeedType.objects.all())
        expense_types = list(ExpenseType.objects.all())
        income_types = list(IncomeType.objects.all())
        
        # Create stockings
        self.create_stockings(user, ponds, species)
        
        # Create daily logs
        self.create_daily_logs(user, ponds)
        
        # Create feeding records
        self.create_feeding_records(user, ponds, species, feed_types)
        
        # Create fish sampling
        self.create_fish_sampling(user, ponds, species)
        
        # Create water quality sampling
        self.create_water_sampling(user, ponds)
        
        # Create mortality records
        self.create_mortality_records(user, ponds, species)
        
        # Create harvest records
        self.create_harvest_records(user, ponds, species)
        
        # Create expenses
        self.create_expenses(user, ponds, expense_types)
        
        # Create income
        self.create_income(user, ponds, income_types)
        
        # Create feeding advice
        self.create_feeding_advice(user, ponds, species)

    def create_stockings(self, user, ponds, species):
        """Create demo stocking records"""
        self.stdout.write('Creating demo stocking records...')
        
        for i, pond in enumerate(ponds[:3]):  # Stock first 3 ponds
            species_choice = species[i % len(species)]
            
            # Initial stocking
            pcs = random.randint(1000, 3000)
            initial_avg_weight = Decimal('0.005')  # 5g fingerlings
            total_weight = pcs * initial_avg_weight
            
            Stocking.objects.create(
                pond=pond,
                species=species_choice,
                date=date.today() - timedelta(days=120),
                pcs=pcs,
                initial_avg_weight_kg=initial_avg_weight,
                total_weight_kg=total_weight,
                notes=f'Initial stocking of {species_choice.name} fingerlings'
            )
            
            # Additional stocking (if multiple species)
            if len(species) > 1:
                additional_species = species[(i + 1) % len(species)]
                pcs2 = random.randint(500, 1500)
                initial_avg_weight2 = Decimal('0.010')  # 10g fingerlings
                total_weight2 = pcs2 * initial_avg_weight2
                
                Stocking.objects.create(
                    pond=pond,
                    species=additional_species,
                    date=date.today() - timedelta(days=90),
                    pcs=pcs2,
                    initial_avg_weight_kg=initial_avg_weight2,
                    total_weight_kg=total_weight2,
                    notes=f'Additional stocking of {additional_species.name}'
                )

    def create_daily_logs(self, user, ponds):
        """Create demo daily logs"""
        self.stdout.write('Creating demo daily logs...')
        
        for pond in ponds:
            for i in range(30):  # Last 30 days
                log_date = date.today() - timedelta(days=i)
                DailyLog.objects.create(
                    pond=pond,
                    date=log_date,
                    weather=random.choice(['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy']),
                    water_temp_c=Decimal('26.0') + Decimal(str(random.uniform(-3, 3))),
                    ph=Decimal('7.2') + Decimal(str(random.uniform(-0.5, 0.5))),
                    dissolved_oxygen=Decimal('6.5') + Decimal(str(random.uniform(-1, 1))),
                    ammonia=Decimal('0.1') + Decimal(str(random.uniform(-0.05, 0.05))),
                    nitrite=Decimal('0.05') + Decimal(str(random.uniform(-0.02, 0.02))),
                    notes=f'Daily observation for {pond.name}'
                )

    def create_feeding_records(self, user, ponds, species, feed_types):
        """Create demo feeding records"""
        self.stdout.write('Creating demo feeding records...')
        
        for pond in ponds:
            for i in range(20):  # Last 20 days
                feed_date = date.today() - timedelta(days=i)
                feed_type = random.choice(feed_types)
                amount_kg = Decimal(str(random.uniform(5, 25)))
                cost_per_kg = Decimal(str(random.uniform(30, 50)))
                
                Feed.objects.create(
                    pond=pond,
                    feed_type=feed_type,
                    date=feed_date,
                    amount_kg=amount_kg,
                    cost_per_kg=cost_per_kg,
                    total_cost=amount_kg * cost_per_kg,
                    feeding_rate_percent=Decimal(str(random.uniform(2, 6))),
                    biomass_at_feeding_kg=Decimal(str(random.uniform(100, 500))),
                    notes=f'Regular feeding for {pond.name}'
                )

    def create_fish_sampling(self, user, ponds, species):
        """Create demo fish sampling records"""
        self.stdout.write('Creating demo fish sampling records...')
        
        for pond in ponds:
            pond_species = list(Species.objects.all())[:2]
            for i in range(8):  # 8 sampling events over time
                sample_date = date.today() - timedelta(days=i * 15)
                for species_obj in pond_species:
                    avg_weight = Decimal('0.005') + Decimal(str(i * 0.05))  # Growing over time
                    sample_size = random.randint(20, 50)
                    total_weight = sample_size * avg_weight
                    fish_per_kg = Decimal('1') / avg_weight
                    
                    FishSampling.objects.create(
                        pond=pond,
                        species=species_obj,
                        user=user,
                        date=sample_date,
                        sample_size=sample_size,
                        total_weight_kg=total_weight,
                        average_weight_kg=avg_weight,
                        fish_per_kg=fish_per_kg,
                        condition_factor=Decimal(str(random.uniform(1.5, 2.5))),
                        notes=f'Growth monitoring for {species_obj.name}'
                    )

    def create_water_sampling(self, user, ponds):
        """Create demo water quality sampling"""
        self.stdout.write('Creating demo water sampling records...')
        
        sample_type = SampleType.objects.get(name='Water Quality')
        
        for pond in ponds:
            for i in range(10):  # 10 sampling events
                sample_date = date.today() - timedelta(days=i * 7)
                Sampling.objects.create(
                    pond=pond,
                    sample_type=sample_type,
                    date=sample_date,
                    temperature_c=Decimal('26.0') + Decimal(str(random.uniform(-2, 2))),
                    ph=Decimal('7.2') + Decimal(str(random.uniform(-0.5, 0.5))),
                    dissolved_oxygen=Decimal('6.5') + Decimal(str(random.uniform(-1, 1))),
                    turbidity=Decimal('15.0') + Decimal(str(random.uniform(-5, 5))),
                    ammonia=Decimal('0.1') + Decimal(str(random.uniform(-0.05, 0.05))),
                    nitrite=Decimal('0.05') + Decimal(str(random.uniform(-0.02, 0.02))),
                    notes=f'Water quality check for {pond.name}'
                )

    def create_mortality_records(self, user, ponds, species):
        """Create demo mortality records"""
        self.stdout.write('Creating demo mortality records...')
        
        for pond in ponds:
            pond_species = list(Species.objects.all())[:2]
            for i in range(5):  # 5 mortality events
                mortality_date = date.today() - timedelta(days=i * 20)
                for species_obj in pond_species:
                    if random.random() < 0.7:  # 70% chance of mortality
                        count = random.randint(5, 50)
                        avg_weight = Decimal(str(random.uniform(0.01, 0.1)))  # Convert to kg
                        total_weight = count * avg_weight
                        
                        Mortality.objects.create(
                            pond=pond,
                            species=species_obj,
                            date=mortality_date,
                            count=count,
                            avg_weight_kg=avg_weight,
                            total_weight_kg=total_weight,
                            cause=random.choice(['Disease', 'Predation', 'Water Quality', 'Unknown']),
                            notes=f'Mortality event for {species_obj.name}'
                        )

    def create_harvest_records(self, user, ponds, species):
        """Create demo harvest records"""
        self.stdout.write('Creating demo harvest records...')
        
        for pond in ponds:
            pond_species = list(Species.objects.all())[:2]
            for i in range(3):  # 3 harvest events
                harvest_date = date.today() - timedelta(days=i * 40)
                for species_obj in pond_species:
                    if random.random() < 0.8:  # 80% chance of harvest
                        total_weight = Decimal(str(random.uniform(50, 200)))
                        pieces_per_kg = Decimal(str(random.uniform(2, 4)))
                        total_count = int(total_weight * pieces_per_kg)
                        price_per_kg = Decimal(str(random.uniform(150, 250)))
                        
                        Harvest.objects.create(
                            pond=pond,
                            species=species_obj,
                            date=harvest_date,
                            total_weight_kg=total_weight,
                            pieces_per_kg=pieces_per_kg,
                            price_per_kg=price_per_kg,
                            total_revenue=total_weight * price_per_kg,
                            notes=f'Harvest of {species_obj.name} from {pond.name}'
                        )

    def create_expenses(self, user, ponds, expense_types):
        """Create demo expense records"""
        self.stdout.write('Creating demo expense records...')
        
        for pond in ponds:
            for i in range(15):  # 15 expense records
                expense_date = date.today() - timedelta(days=i * 5)
                expense_type = random.choice(expense_types)
                amount = Decimal(str(random.uniform(100, 2000)))
                
                Expense.objects.create(
                    pond=pond,
                    expense_type=expense_type,
                    user=user,
                    date=expense_date,
                    amount=amount,
                    notes=f'Regular {expense_type.name.lower()} expense for {pond.name}'
                )

    def create_income(self, user, ponds, income_types):
        """Create demo income records"""
        self.stdout.write('Creating demo income records...')
        
        for pond in ponds:
            for i in range(5):  # 5 income records
                income_date = date.today() - timedelta(days=i * 20)
                income_type = random.choice(income_types)
                amount = Decimal(str(random.uniform(5000, 25000)))
                
                Income.objects.create(
                    pond=pond,
                    income_type=income_type,
                    user=user,
                    date=income_date,
                    amount=amount,
                    notes=f'Revenue from {income_type.name.lower()} for {pond.name}'
                )

    def create_feeding_advice(self, user, ponds, species):
        """Create demo feeding advice records"""
        self.stdout.write('Creating demo feeding advice records...')
        
        for pond in ponds:
            pond_species = list(Species.objects.all())[:2]
            for species_obj in pond_species:
                estimated_count = random.randint(800, 2000)
                avg_weight = Decimal(str(random.uniform(0.1, 0.3)))
                total_biomass = estimated_count * avg_weight
                recommended_feed = total_biomass * Decimal('0.03')  # 3% of biomass
                
                FeedingAdvice.objects.create(
                    pond=pond,
                    species=species_obj,
                    user=user,
                    date=date.today(),
                    estimated_fish_count=estimated_count,
                    average_fish_weight_kg=avg_weight,
                    total_biomass_kg=total_biomass,
                    recommended_feed_kg=recommended_feed,
                    feeding_rate_percent=Decimal('3.0'),
                    feeding_frequency=random.randint(2, 4),
                    water_temp_c=Decimal('26.0'),
                    season='summer',
                    notes=f'AI-generated feeding advice for {species_obj.name} in {pond.name}'
                )
