from django.core.management.base import BaseCommand
from fish_farming.models import FishSampling


class Command(BaseCommand):
    help = 'Update growth rates for existing fish sampling records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pond-id',
            type=int,
            help='Update growth rates for specific pond only',
        )
        parser.add_argument(
            '--species-id',
            type=int,
            help='Update growth rates for specific species only',
        )

    def handle(self, *args, **options):
        pond_id = options.get('pond_id')
        species_id = options.get('species_id')

        # Build filter
        filters = {}
        if pond_id:
            filters['pond_id'] = pond_id
        if species_id:
            filters['species_id'] = species_id

        # Get fish sampling records
        samplings = FishSampling.objects.filter(**filters).order_by('pond', 'date')
        
        if not samplings.exists():
            self.stdout.write(
                self.style.WARNING('No fish sampling records found to update')
            )
            return

        updated_count = 0
        
        # Group by pond only (not species) to handle mixed species scenarios
        current_pond = None
        
        for sampling in samplings:
            # Check if we're starting a new pond
            if current_pond != sampling.pond:
                current_pond = sampling.pond
                self.stdout.write(f'\nProcessing: {sampling.pond.name}')
            
            # Calculate growth rate using the improved logic
            old_growth_rate = sampling.growth_rate_kg_per_day
            
            # Use the same logic as the model's calculate_growth_rate method
            if sampling.species:
                # First try to find previous sampling with same species
                previous_sampling = FishSampling.objects.filter(
                    pond=sampling.pond,
                    species=sampling.species,
                    date__lt=sampling.date
                ).order_by('-date').first()
                
                # If no same species found, look for any previous sampling in the same pond
                if not previous_sampling:
                    previous_sampling = FishSampling.objects.filter(
                        pond=sampling.pond,
                        date__lt=sampling.date
                    ).order_by('-date').first()
            else:
                # If no species specified, look for any previous sampling in the same pond
                previous_sampling = FishSampling.objects.filter(
                    pond=sampling.pond,
                    date__lt=sampling.date
                ).order_by('-date').first()
            
            if previous_sampling and previous_sampling.average_weight_kg:
                # Calculate days difference
                days_diff = (sampling.date - previous_sampling.date).days
                
                if days_diff > 0:
                    # Calculate weight difference
                    weight_diff = sampling.average_weight_kg - previous_sampling.average_weight_kg
                    
                    # Calculate daily growth rate
                    sampling.growth_rate_kg_per_day = weight_diff / days_diff
                    
                    species_info = f" ({sampling.species.name if sampling.species else 'Mixed'})"
                    prev_species_info = f" ({previous_sampling.species.name if previous_sampling.species else 'Mixed'})"
                    
                    self.stdout.write(
                        f'  {sampling.date}{species_info}: {sampling.average_weight_kg} kg '
                        f'(+{weight_diff:.3f} kg over {days_diff} days = {sampling.growth_rate_kg_per_day:.4f} kg/day)'
                    )
                    self.stdout.write(f'    Previous: {previous_sampling.date}{prev_species_info}: {previous_sampling.average_weight_kg} kg')
                else:
                    sampling.growth_rate_kg_per_day = None
                    self.stdout.write(f'  {sampling.date}: {sampling.average_weight_kg} kg (same date as previous)')
            else:
                sampling.growth_rate_kg_per_day = None
                species_info = f" ({sampling.species.name if sampling.species else 'Mixed'})"
                self.stdout.write(f'  {sampling.date}{species_info}: {sampling.average_weight_kg} kg (first sampling)')
            
            # Save if growth rate changed
            if old_growth_rate != sampling.growth_rate_kg_per_day:
                sampling.save()
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'\nCompleted! Updated {updated_count} fish sampling records')
        )