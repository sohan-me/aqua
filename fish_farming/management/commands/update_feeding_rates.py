from django.core.management.base import BaseCommand
from fish_farming.models import Feed
from decimal import Decimal


class Command(BaseCommand):
    help = 'Update feeding rates for existing feed records'

    def handle(self, *args, **options):
        feeds = Feed.objects.all()
        updated_count = 0
        
        self.stdout.write(f'Processing {feeds.count()} feed records...')
        
        for feed in feeds:
            # Skip if feeding rate is already calculated
            if feed.feeding_rate_percent:
                continue
                
            # Try to calculate from biomass and amount
            if feed.biomass_at_feeding_kg and feed.amount_kg:
                try:
                    feeding_rate = (feed.amount_kg / feed.biomass_at_feeding_kg) * 100
                    feed.feeding_rate_percent = feeding_rate
                    feed.save(update_fields=['feeding_rate_percent'])
                    updated_count += 1
                    self.stdout.write(f'Updated feed {feed.id}: {feeding_rate:.4f}%')
                except Exception as e:
                    self.stdout.write(f'Error updating feed {feed.id}: {e}')
            else:
                self.stdout.write(f'Feed {feed.id}: Missing biomass or amount data')
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} feed records')
        )
