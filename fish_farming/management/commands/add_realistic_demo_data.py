from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from fish_farming.models import (
    Pond, Species, FeedType, Stocking, DailyLog, Feed, 
    FishSampling, Mortality, Harvest, Expense, Income,
    ExpenseType, IncomeType, FeedingAdvice
)

class Command(BaseCommand):
    help = 'Add realistic demo data for testing calculations'

    def handle(self, *args, **options):
        self.stdout.write('Adding realistic demo data...')
        
        # Get or create user
        user, created = User.objects.get_or_create(
            username='farmer',
            defaults={'email': 'farmer@example.com'}
        )
        if created:
            user.set_password('password123')
            user.save()
        
        # Create species
        species_data = [
            {'name': 'Nile Tilapia', 'scientific_name': 'Oreochromis niloticus'},
            {'name': 'Catfish', 'scientific_name': 'Clarias gariepinus'},
            {'name': 'Carp', 'scientific_name': 'Cyprinus carpio'},
        ]
        
        species_objects = []
        for spec in species_data:
            species, created = Species.objects.get_or_create(
                name=spec['name'],
                defaults={
                    'scientific_name': spec['scientific_name'],
                    'description': f'Commercial fish species: {spec["scientific_name"]}'
                }
            )
            species_objects.append(species)
        
        # Create ponds
        ponds_data = [
            {'name': 'Pond A - Main Production', 'area_decimal': 25, 'depth_ft': 5},
            {'name': 'Pond B - Nursery', 'area_decimal': 12, 'depth_ft': 3},
            {'name': 'Pond C - Grow-out', 'area_decimal': 20, 'depth_ft': 4},
        ]
        
        pond_objects = []
        for pond_data in ponds_data:
            pond, created = Pond.objects.get_or_create(
                name=pond_data['name'],
                defaults={
                    'area_decimal': pond_data['area_decimal'],
                    'depth_ft': pond_data['depth_ft'],
                    'location': 'Fish Farm Location',
                    'user': user
                }
            )
            pond_objects.append(pond)
        
        # Create feed types
        feed_types_data = [
            {'name': 'Starter Feed', 'protein_content': 40},
            {'name': 'Grower Feed', 'protein_content': 32},
            {'name': 'Finisher Feed', 'protein_content': 28},
        ]
        
        feed_type_objects = []
        for feed_type_data in feed_types_data:
            feed_type, created = FeedType.objects.get_or_create(
                name=feed_type_data['name'],
                defaults={
                    'protein_content': feed_type_data['protein_content'],
                    'description': f'{feed_type_data["name"]} with {feed_type_data["protein_content"]}% protein'
                }
            )
            feed_type_objects.append(feed_type)
        
        # Create expense and income types
        expense_types_data = [
            {'name': 'Feed', 'description': 'Fish feed expenses'},
            {'name': 'Labor', 'description': 'Labor costs'},
            {'name': 'Medicine', 'description': 'Veterinary and medicine costs'},
            {'name': 'Utilities', 'description': 'Electricity and water costs'},
            {'name': 'Maintenance', 'description': 'Equipment and pond maintenance'},
        ]
        
        expense_type_objects = []
        for exp_type in expense_types_data:
            expense_type, created = ExpenseType.objects.get_or_create(
                name=exp_type['name'],
                defaults={
                    'description': exp_type['description'],
                    'category': exp_type['name'].lower().replace(' ', '_')
                }
            )
            expense_type_objects.append(expense_type)
        
        income_types_data = [
            {'name': 'Fish Sales', 'description': 'Revenue from fish sales'},
            {'name': 'Other Income', 'description': 'Other revenue sources'},
        ]
        
        income_type_objects = []
        for inc_type in income_types_data:
            income_type, created = IncomeType.objects.get_or_create(
                name=inc_type['name'],
                defaults={
                    'description': inc_type['description'],
                    'category': 'harvest' if 'sales' in inc_type['name'].lower() else 'other'
                }
            )
            income_type_objects.append(income_type)
        
        # Create realistic stocking data (3 months ago)
        start_date = timezone.now().date() - timedelta(days=90)
        
        stocking_data = [
            {'pond': pond_objects[0], 'species': species_objects[0], 'pcs': 1000, 'initial_avg_weight_kg': 0.005, 'date': start_date},
            {'pond': pond_objects[0], 'species': species_objects[1], 'pcs': 800, 'initial_avg_weight_kg': 0.008, 'date': start_date},
            {'pond': pond_objects[1], 'species': species_objects[0], 'pcs': 1200, 'initial_avg_weight_kg': 0.003, 'date': start_date},
            {'pond': pond_objects[2], 'species': species_objects[1], 'pcs': 600, 'initial_avg_weight_kg': 0.010, 'date': start_date},
        ]
        
        for stocking_info in stocking_data:
            total_weight_kg = stocking_info['pcs'] * stocking_info['initial_avg_weight_kg']
            pieces_per_kg = stocking_info['pcs'] / total_weight_kg if total_weight_kg > 0 else 0
            
            Stocking.objects.get_or_create(
                pond=stocking_info['pond'],
                species=stocking_info['species'],
                date=stocking_info['date'],
                defaults={
                    'pcs': stocking_info['pcs'],
                    'initial_avg_weight_kg': stocking_info['initial_avg_weight_kg'],
                    'total_weight_kg': total_weight_kg,
                    'pieces_per_kg': pieces_per_kg,
                    'notes': f'Initial stocking of {stocking_info["species"].name}'
                }
            )
        
        # Create realistic fish sampling data (monthly intervals)
        sampling_dates = [
            start_date,
            start_date + timedelta(days=30),
            start_date + timedelta(days=60),
            timezone.now().date() - timedelta(days=7),  # Recent sampling
        ]
        
        # Realistic weight progression for each species
        weight_progressions = {
            species_objects[0]: [5, 25, 80, 120],  # Nile Tilapia: 5g -> 120g
            species_objects[1]: [8, 35, 100, 150],  # Catfish: 8g -> 150g
            species_objects[2]: [6, 30, 90, 130],   # Carp: 6g -> 130g
        }
        
        for pond in pond_objects:
            for species in species_objects:
                if Stocking.objects.filter(pond=pond, species=species).exists():
                    for i, date in enumerate(sampling_dates):
                        if i < len(weight_progressions[species]):
                            avg_weight_g = weight_progressions[species][i]
                            avg_weight_kg = Decimal(str(avg_weight_g / 1000))
                            sample_size = random.randint(20, 50)
                            total_weight_kg = Decimal(str((avg_weight_g * sample_size) / 1000))
                            fish_per_kg = Decimal(str(1000 / avg_weight_g))
                            
                            FishSampling.objects.get_or_create(
                                pond=pond,
                                species=species,
                                date=date,
                                defaults={
                                    'sample_size': sample_size,
                                    'total_weight_kg': total_weight_kg,
                                    'average_weight_kg': avg_weight_kg,
                                    'fish_per_kg': fish_per_kg,
                                    'notes': f'Monthly growth monitoring for {species.name}',
                                    'user': user
                                }
                            )
        
        # Create realistic feeding data (daily for last 30 days)
        feed_date = timezone.now().date() - timedelta(days=30)
        
        for day in range(30):
            current_date = feed_date + timedelta(days=day)
            
            for pond in pond_objects:
                # Calculate total feed amount for all species in the pond
                total_feed_amount = Decimal('0')
                feed_type = feed_type_objects[1]  # Default to grower feed
                
                for species in species_objects:
                    if Stocking.objects.filter(pond=pond, species=species).exists():
                        # Calculate realistic feed amount based on fish weight and count
                        latest_sampling = FishSampling.objects.filter(
                            pond=pond, species=species, date__lte=current_date
                        ).order_by('-date').first()
                        
                        if latest_sampling:
                            # Estimate current fish count (accounting for some mortality)
                            stocking = Stocking.objects.filter(pond=pond, species=species).first()
                            estimated_count = int(stocking.pcs * 0.85)  # 15% mortality
                            
                            # Calculate feed amount (3-5% of body weight per day)
                            daily_feed_rate = Decimal('0.04')  # 4% of body weight
                            total_biomass = estimated_count * latest_sampling.average_weight_kg
                            species_feed_amount = total_biomass * daily_feed_rate
                            
                            # Add some variation
                            variation = Decimal(str(random.uniform(0.8, 1.2)))
                            species_feed_amount = species_feed_amount * variation
                            
                            total_feed_amount += species_feed_amount
                            
                            # Choose appropriate feed type based on fish size
                            if latest_sampling.average_weight_kg < Decimal('0.05'):  # < 50g
                                feed_type = feed_type_objects[0]  # Starter
                            elif latest_sampling.average_weight_kg < Decimal('0.15'):  # < 150g
                                feed_type = feed_type_objects[1]  # Grower
                            else:
                                feed_type = feed_type_objects[2]  # Finisher
                
                # Create one feed record per pond per day
                if total_feed_amount > 0:
                    Feed.objects.get_or_create(
                        pond=pond,
                        date=current_date,
                        defaults={
                            'feed_type': feed_type,
                            'amount_kg': total_feed_amount,
                            'notes': f'Daily feeding for {pond.name}',
                            'cost_per_kg': Decimal('2.00'),
                            'total_cost': total_feed_amount * Decimal('2.00')
                        }
                    )
        
        # Create some mortality records
        mortality_data = [
            {'pond': pond_objects[0], 'species': species_objects[0], 'count': 15, 'date': start_date + timedelta(days=15)},
            {'pond': pond_objects[1], 'species': species_objects[0], 'count': 8, 'date': start_date + timedelta(days=20)},
            {'pond': pond_objects[0], 'species': species_objects[1], 'count': 12, 'date': start_date + timedelta(days=25)},
        ]
        
        for mortality_info in mortality_data:
            Mortality.objects.get_or_create(
                pond=mortality_info['pond'],
                species=mortality_info['species'],
                date=mortality_info['date'],
                defaults={
                    'count': mortality_info['count'],
                    'cause': 'Natural mortality',
                    'notes': 'Regular mortality monitoring'
                }
            )
        
        # Create some harvest records (recent)
        harvest_data = [
            {
                'pond': pond_objects[0], 
                'species': species_objects[0], 
                'total_weight_kg': Decimal('150.0'),
                'total_count': 1200,
                'price_per_kg': Decimal('4.50'),
                'date': timezone.now().date() - timedelta(days=5)
            },
            {
                'pond': pond_objects[1], 
                'species': species_objects[0], 
                'total_weight_kg': Decimal('80.0'),
                'total_count': 800,
                'price_per_kg': Decimal('4.20'),
                'date': timezone.now().date() - timedelta(days=3)
            },
        ]
        
        for harvest_info in harvest_data:
            # Calculate pieces per kg and average weight
            pieces_per_kg = harvest_info['total_count'] / harvest_info['total_weight_kg']
            avg_weight_kg = harvest_info['total_weight_kg'] / harvest_info['total_count']
            total_revenue = harvest_info['total_weight_kg'] * harvest_info['price_per_kg']
            
            Harvest.objects.get_or_create(
                pond=harvest_info['pond'],
                species=harvest_info['species'],
                date=harvest_info['date'],
                defaults={
                    'total_weight_kg': harvest_info['total_weight_kg'],
                    'total_count': harvest_info['total_count'],
                    'pieces_per_kg': pieces_per_kg,
                    'avg_weight_kg': avg_weight_kg,
                    'price_per_kg': harvest_info['price_per_kg'],
                    'total_revenue': total_revenue,
                    'notes': f'Harvest of {harvest_info["species"].name}'
                }
            )
        
        # Create some expense records
        for day in range(30):
            current_date = feed_date + timedelta(days=day)
            
            for pond in pond_objects:
                # Feed expenses
                daily_feed_cost = Decimal(str(random.uniform(50, 150)))
                Expense.objects.get_or_create(
                    pond=pond,
                    expense_type=expense_type_objects[0],  # Feed
                    date=current_date,
                    defaults={
                        'amount': daily_feed_cost,
                        'notes': f'Daily feed expense for {pond.name}',
                        'user': user
                    }
                )
                
                # Occasional other expenses
                if random.random() < 0.1:  # 10% chance
                    other_expense = Decimal(str(random.uniform(20, 100)))
                    Expense.objects.get_or_create(
                        pond=pond,
                        expense_type=expense_type_objects[1],  # Labor
                        date=current_date,
                        defaults={
                            'amount': other_expense,
                            'notes': f'Labor expense for {pond.name}',
                            'user': user
                        }
                    )
        
        # Create some income records
        for harvest in Harvest.objects.all():
            Income.objects.get_or_create(
                pond=harvest.pond,
                income_type=income_type_objects[0],  # Fish Sales
                date=harvest.date,
                defaults={
                    'amount': harvest.total_revenue,
                    'notes': f'Revenue from {harvest.species.name} harvest',
                    'user': user
                }
            )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully added realistic demo data!')
        )
        
        # Print summary
        self.stdout.write(f'Created:')
        self.stdout.write(f'- {Pond.objects.count()} ponds')
        self.stdout.write(f'- {Species.objects.count()} species')
        self.stdout.write(f'- {Stocking.objects.count()} stocking records')
        self.stdout.write(f'- {FishSampling.objects.count()} sampling records')
        self.stdout.write(f'- {Feed.objects.count()} feeding records')
        self.stdout.write(f'- {Mortality.objects.count()} mortality records')
        self.stdout.write(f'- {Harvest.objects.count()} harvest records')
        self.stdout.write(f'- {Expense.objects.count()} expense records')
        self.stdout.write(f'- {Income.objects.count()} income records')
