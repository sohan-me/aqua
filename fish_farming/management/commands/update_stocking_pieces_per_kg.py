from django.core.management.base import BaseCommand
from fish_farming.models import Stocking
from decimal import Decimal

class Command(BaseCommand):
    help = 'Update pieces_per_kg for existing stocking records that are missing this calculation'

    def handle(self, *args, **options):
        # Find stocking records where pieces_per_kg is None or 0 but we have pcs and total_weight_kg
        stockings_to_update = Stocking.objects.filter(
            pieces_per_kg__isnull=True
        ).exclude(
            pcs__isnull=True
        ).exclude(
            total_weight_kg__isnull=True
        ).exclude(
            total_weight_kg=0
        )
        
        updated_count = 0
        
        for stocking in stockings_to_update:
            if stocking.pcs and stocking.total_weight_kg and stocking.total_weight_kg > 0:
                old_pieces_per_kg = stocking.pieces_per_kg
                stocking.pieces_per_kg = stocking.pcs / stocking.total_weight_kg
                stocking.initial_avg_weight_kg = stocking.total_weight_kg / stocking.pcs
                stocking.save()
                
                self.stdout.write(
                    f'Updated stocking {stocking.stocking_id}: '
                    f'pieces_per_kg: {old_pieces_per_kg} -> {stocking.pieces_per_kg:.10f}, '
                    f'initial_avg_weight_kg: {stocking.initial_avg_weight_kg:.10f}'
                )
                updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} stocking records')
        )
