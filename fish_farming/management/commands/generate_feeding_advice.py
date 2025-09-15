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
        
        # Need at least one fish sampling record
        if not FishSampling.objects.filter(pond=pond, species=species).exists():
            return False
        
        return True

    def generate_advice_data(self, pond, species):
        """Generate comprehensive feeding advice data"""
        today = timezone.now().date()
        
        # 1. Get latest stocking data
        latest_stocking = Stocking.objects.filter(
            pond=pond, species=species
        ).order_by('-date').first()
        
        # 2. Get latest fish sampling data
        latest_sampling = FishSampling.objects.filter(
            pond=pond, species=species
        ).order_by('-date').first()
        
        # 3. Calculate current fish count
        total_stocked = Stocking.objects.filter(
            pond=pond, species=species
        ).aggregate(total=Sum('pcs'))['total'] or 0
        
        total_mortality = Mortality.objects.filter(
            pond=pond, species=species
        ).aggregate(total=Sum('count'))['total'] or 0
        
        total_harvested = Harvest.objects.filter(
            pond=pond, species=species
        ).aggregate(total=Sum('total_count'))['total'] or 0
        
        estimated_fish_count = total_stocked - total_mortality - total_harvested
        
        # 4. Get environmental data
        latest_log = DailyLog.objects.filter(pond=pond).order_by('-date').first()
        latest_water_sample = Sampling.objects.filter(pond=pond).order_by('-date').first()
        
        # 5. Analyze recent feeding patterns
        recent_feeding = Feed.objects.filter(
            pond=pond, species=species
        ).order_by('-date')[:7]  # Last 7 days
        
        avg_daily_feed = recent_feeding.aggregate(
            avg=Avg('feed_amount_kg')
        )['avg'] or 0
        
        # 6. Analyze mortality patterns
        recent_mortality = Mortality.objects.filter(
            pond=pond, species=species,
            date__gte=today - timedelta(days=30)
        ).aggregate(total=Sum('count'))['total'] or 0
        
        # 7. Determine season
        current_month = timezone.now().month
        if current_month in [12, 1, 2]:
            season = 'winter'
        elif current_month in [3, 4, 5]:
            season = 'spring'
        elif current_month in [6, 7, 8]:
            season = 'summer'
        else:
            season = 'autumn'
        
        # 8. Calculate growth rate
        previous_sampling = FishSampling.objects.filter(
            pond=pond, species=species
        ).order_by('-date')[1:2].first()
        
        growth_rate_kg_per_day = 0
        if previous_sampling:
            days_diff = (latest_sampling.date - previous_sampling.date).days
            if days_diff > 0:
                weight_diff = latest_sampling.average_weight_kg - previous_sampling.average_weight_kg
                growth_rate_kg_per_day = weight_diff / days_diff
        
        # 9. Analyze harvest patterns
        recent_harvests = Harvest.objects.filter(
            pond=pond, species=species,
            date__gte=today - timedelta(days=90)
        ).aggregate(
            total_weight=Sum('total_weight_kg'),
            total_count=Sum('total_count'),
            avg_price=Avg('price_per_kg')
        )
        
        # 10. Calculate feed conversion ratio
        total_feed_used = Feed.objects.filter(
            pond=pond, species=species,
            date__gte=latest_stocking.date
        ).aggregate(total=Sum('feed_amount_kg'))['total'] or 0
        
        fcr = 0
        if total_harvested > 0 and total_feed_used > 0:
            fcr = total_feed_used / total_harvested
        
        # 11. Calculate feeding rate based on biomass
        total_biomass_kg = estimated_fish_count * latest_sampling.average_weight_kg
        
        # Base feeding rate by season
        base_rates = {
            'winter': 1.0,  # 1% of biomass
            'spring': 2.0,  # 2% of biomass
            'summer': 3.0,  # 3% of biomass
            'autumn': 2.5,  # 2.5% of biomass
        }
        
        base_rate = base_rates.get(season, 2.0)
        
        # Adjust based on growth rate
        if growth_rate_kg_per_day > 0.01:  # Good growth
            base_rate *= 1.2
        elif growth_rate_kg_per_day < 0.005:  # Slow growth
            base_rate *= 0.8
        
        # Adjust based on mortality
        if recent_mortality > estimated_fish_count * 0.05:  # High mortality
            base_rate *= 0.7
        
        recommended_feed_kg = (total_biomass_kg * base_rate) / 100
        
        # 12. Generate comprehensive notes
        notes_parts = [
            f"Generated on {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            f"=== FISH DATA ===",
            f"Latest fish sampling: {latest_sampling.average_weight_kg} kg avg weight",
            f"Current fish count: {estimated_fish_count} (stocked: {total_stocked}, mortality: {total_mortality}, harvested: {total_harvested})",
            f"Growth rate: {growth_rate_kg_per_day:.4f} kg/day",
            f"=== ENVIRONMENTAL DATA ===",
            f"Season: {season.title()}",
        ]
        
        if latest_log:
            notes_parts.append(f"Latest daily log: {latest_log.date}")
            if latest_log.water_temp_c:
                notes_parts.append(f"Water temp: {latest_log.water_temp_c}°C")
            if latest_log.ph:
                notes_parts.append(f"pH: {latest_log.ph}")
        
        if latest_water_sample:
            notes_parts.append(f"Latest water sample: {latest_water_sample.date}")
            if latest_water_sample.ph:
                notes_parts.append(f"Water pH: {latest_water_sample.ph}")
            if latest_water_sample.temperature_c:
                notes_parts.append(f"Water temp: {latest_water_sample.temperature_c}°C")
            if latest_water_sample.dissolved_oxygen:
                notes_parts.append(f"Dissolved oxygen: {latest_water_sample.dissolved_oxygen} mg/L")
        
        notes_parts.extend([
            f"=== FEEDING DATA ===",
            f"Recent avg daily feed: {avg_daily_feed:.2f} kg",
            f"Total feed used since stocking: {total_feed_used:.2f} kg",
            f"Feed conversion ratio: {fcr:.2f}",
            f"=== PRODUCTION DATA ===",
        ])
        
        if recent_harvests['total_weight']:
            notes_parts.append(f"Recent harvests (90 days): {recent_harvests['total_weight']:.2f} kg")
            if recent_harvests['avg_price']:
                notes_parts.append(f"Average harvest price: ₹{recent_harvests['avg_price']:.2f}/kg")
        
        if recent_mortality > 0:
            notes_parts.append(f"Recent mortality (30 days): {recent_mortality} fish")
        
        notes_parts.extend([
            f"=== RECOMMENDATIONS ===",
            f"Based on {season} season and current biomass",
            f"Recommended feeding rate: {base_rate:.1f}% of biomass",
            f"Estimated daily feed requirement: {recommended_feed_kg:.2f} kg"
        ])
        
        return {
            'user': pond.user,
            'estimated_fish_count': estimated_fish_count,
            'average_fish_weight_kg': latest_sampling.average_weight_kg,
            'total_biomass_kg': total_biomass_kg,
            'recommended_feed_kg': recommended_feed_kg,
            'feeding_rate_percent': base_rate,
            'feeding_frequency': 'twice_daily',
            'water_temp_c': latest_log.water_temp_c if latest_log else None,
            'season': season,
            'notes': '\n'.join(notes_parts),
            'is_applied': False,
        }
