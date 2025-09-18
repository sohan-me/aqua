from django.core.management.base import BaseCommand
from django.db.models import F
from fish_farming.models import Harvest


class Command(BaseCommand):
    help = 'Update harvest records with calculated total_count from pieces_per_kg and total_weight_kg'

    def handle(self, *args, **options):
        updated_count = 0
        
        # Get all harvest records where total_count is null but we have pieces_per_kg and total_weight_kg
        harvests_to_update = Harvest.objects.filter(
            total_count__isnull=True,
            pieces_per_kg__isnull=False,
            total_weight_kg__isnull=False
        ).exclude(
            pieces_per_kg=0,
            total_weight_kg=0
        )
        
        self.stdout.write(f'Found {harvests_to_update.count()} harvest records to update...')
        
        for harvest in harvests_to_update:
            try:
                # Calculate total_count = total_weight_kg * pieces_per_kg
                calculated_count = int(float(harvest.total_weight_kg) * float(harvest.pieces_per_kg))
                
                if calculated_count > 0:
                    harvest.total_count = calculated_count
                    harvest.save(update_fields=['total_count'])
                    updated_count += 1
                    
                    self.stdout.write(
                        f'Updated harvest {harvest.id}: {harvest.total_weight_kg}kg × {harvest.pieces_per_kg} pieces/kg = {calculated_count} fish'
                    )
                    
            except (ValueError, TypeError) as e:
                self.stdout.write(
                    self.style.WARNING(f'Could not update harvest {harvest.id}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} harvest records')
        )
