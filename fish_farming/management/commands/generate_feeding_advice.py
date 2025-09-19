from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Sum
from datetime import timedelta
from fish_farming.models import (
    Pond, Species, Stocking, FishSampling, Mortality, Harvest, 
    FeedingAdvice, DailyLog, Sampling, Feed
)


class Command(BaseCommand):
    help = 'Automatically generate feeding advice for all ponds and species based on existing data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pond-id',
            type=int,
            help='Generate advice for specific pond only',
        )
        parser.add_argument(
            '--species-id',
            type=int,
            help='Generate advice for specific species only',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be generated without creating records',
        )

    def handle(self, *args, **options):
        pond_id = options.get('pond_id')
        species_id = options.get('species_id')
        dry_run = options.get('dry_run')

        # Get ponds to process
        if pond_id:
            ponds = Pond.objects.filter(id=pond_id)
        else:
            ponds = Pond.objects.filter(is_active=True)

        if not ponds.exists():
            self.stdout.write(
                self.style.WARNING('No active ponds found to process')
            )
            return

        generated_count = 0
        skipped_count = 0

        for pond in ponds:
            self.stdout.write(f'\nProcessing pond: {pond.name}')
            
            # Get species for this pond
            if species_id:
                species_list = Species.objects.filter(id=species_id)
            else:
                # Get species that have been stocked in this pond
                stocked_species = Stocking.objects.filter(pond=pond).values_list('species', flat=True).distinct()
                species_list = Species.objects.filter(id__in=stocked_species)

            for species in species_list:
                self.stdout.write(f'  Processing species: {species.name}')
                
                # Check if we have enough data to generate advice
                if not self.has_sufficient_data(pond, species):
                    self.stdout.write(
                        self.style.WARNING(f'    Insufficient data for {species.name} in {pond.name}')
                    )
                    skipped_count += 1
                    continue

                # Generate feeding advice
                advice_data = self.generate_advice_data(pond, species)
                
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(f'    Would generate advice: {advice_data["recommended_feed_kg"]} kg/day')
                    )
                else:
                    # Create or update feeding advice
                    advice, created = FeedingAdvice.objects.update_or_create(
                        pond=pond,
                        species=species,
                        date=timezone.now().date(),
                        defaults=advice_data
                    )
                    
                    if created:
                        self.stdout.write(
                            self.style.SUCCESS(f'    Created new advice: {advice.recommended_feed_kg} kg/day')
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f'    Updated existing advice: {advice.recommended_feed_kg} kg/day')
                        )
                
                generated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Generated {generated_count} feeding advice records, skipped {skipped_count}'
            )
        )

    def has_sufficient_data(self, pond, species):
        """Check if we have enough data to generate meaningful advice"""
        # Need at least one stocking record
        if not Stocking.objects.filter(pond=pond, species=species).exists():
            return False
        
        # Can work with either fish sampling data OR just stocking data
        # Fish sampling data is preferred but not required
        return True

    def generate_advice_data(self, pond, species):
        """Generate comprehensive feeding advice data"""
        from fish_farming.views import FeedingAdviceViewSet
        from django.contrib.auth.models import User
        
        # Use the new feeding advice generation logic from views
        viewset = FeedingAdviceViewSet()
        
        # Get a user (use the first superuser or create a system user)
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.first()
        
        if not user:
            return None
        
        # Generate advice using the new method
        advice_data = viewset._generate_advice_for_species(pond, species, None)
        
        if not advice_data:
            return None
        
        # Convert to the format expected by the management command
        return {
            'pond': pond,
            'species': species,
            'user': user,
            'date': advice_data['date'],
            'estimated_fish_count': advice_data['estimated_fish_count'],
            'average_fish_weight_kg': advice_data['average_fish_weight_kg'],
            'total_biomass_kg': advice_data['total_biomass_kg'],
            'recommended_feed_kg': advice_data['recommended_feed_kg'],
            'feeding_rate_percent': advice_data['feeding_rate_percent'],
            'feeding_frequency': advice_data['feeding_frequency'],
            'water_temp_c': advice_data.get('water_temp_c'),
            'season': advice_data.get('season', 'summer'),
            'medical_considerations': advice_data.get('medical_considerations', ''),
            'medical_warnings': advice_data.get('medical_warnings', []),
            'notes': advice_data.get('notes', ''),
            'feed_type': advice_data.get('feed_type'),
            'feed_cost_per_kg': advice_data.get('feed_cost_per_kg'),
            'daily_feed_cost': advice_data.get('daily_feed_cost')
        }
