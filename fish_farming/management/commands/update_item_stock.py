from django.core.management.base import BaseCommand
from fish_farming.models import Item


class Command(BaseCommand):
    help = 'Update current stock for all items based on inventory transactions'

    def handle(self, *args, **options):
        self.stdout.write('Updating item stock levels...')
        
        items_updated = 0
        for item in Item.objects.all():
            old_stock = item.current_stock
            item.update_current_stock()
            if old_stock != item.current_stock:
                self.stdout.write(
                    f'Updated {item.name}: {old_stock} → {item.current_stock}'
                )
                items_updated += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated stock for {items_updated} items'
            )
        )
