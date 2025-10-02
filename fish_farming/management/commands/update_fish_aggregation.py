from django.core.management.base import BaseCommand
from fish_farming.models import Item


class Command(BaseCommand):
    help = 'Update fish aggregation (fish_count and fish_total_weight_kg) for all fish items based on stock entries'

    def handle(self, *args, **options):
        # Get all fish items
        fish_items = Item.objects.filter(category='fish')
        
        updated_count = 0
        for item in fish_items:
            old_count = item.fish_count
            old_weight = item.fish_total_weight_kg
            
            # Update fish aggregation
            item.update_fish_aggregation()
            
            # Refresh from database to get updated values
            item.refresh_from_db()
            
            if old_count != item.fish_count or old_weight != item.fish_total_weight_kg:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated {item.name}: fish_count {old_count} -> {item.fish_count}, '
                        f'weight {old_weight} -> {item.fish_total_weight_kg} kg'
                    )
                )
                updated_count += 1
            else:
                self.stdout.write(f'No change for {item.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully updated {updated_count} fish item(s)'
            )
        )

