from django.core.management.base import BaseCommand
from fish_farming.models import FeedingBand
import requests
import json
from decimal import Decimal


class Command(BaseCommand):
    help = 'Import feeding guide data from Google Sheets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--url',
            type=str,
            help='Google Sheets URL to import from',
            default='https://docs.google.com/spreadsheets/d/1TMUspiOSe71TS-XYmBorfMZ0r6-YNVRqLRoXtq9rh2U/export?format=csv'
        )

    def handle(self, *args, **options):
        url = options['url']
        
        try:
            # Fetch the CSV data from Google Sheets
            response = requests.get(url)
            response.raise_for_status()
            
            # Parse CSV data
            csv_lines = response.text.strip().split('\n')
            headers = csv_lines[0].split(',')
            
            # Clear existing feeding bands
            FeedingBand.objects.all().delete()
            self.stdout.write('Cleared existing feeding bands')
            
            # Process each row (skip header)
            created_count = 0
            for line in csv_lines[1:]:
                if not line.strip():
                    continue
                    
                values = [v.strip('"') for v in line.split(',')]
                
                # Skip empty rows
                if not values[0] or not values[1]:
                    continue
                
                try:
                    min_weight = float(values[0]) if values[0] else 0
                    max_weight = float(values[1]) if values[1] else 0
                    feed_type = values[2] if len(values) > 2 else ''
                    pellet_size = values[3] if len(values) > 3 else ''
                    feeds_per_day = int(values[4]) if len(values) > 4 and values[4] else 2
                    bw_percent = float(values[5]) if len(values) > 5 and values[5] else 3.0
                    notes = values[6] if len(values) > 6 else ''
                    
                    # Create feeding band
                    FeedingBand.objects.create(
                        name=f"{feed_type} ({min_weight}-{max_weight}g)",
                        min_weight_g=Decimal(str(min_weight)),
                        max_weight_g=Decimal(str(max_weight)),
                        feeding_rate_percent=Decimal(str(bw_percent)),
                        frequency_per_day=feeds_per_day,
                        notes=f"{feed_type} - {pellet_size} - {notes}"
                    )
                    created_count += 1
                    
                except (ValueError, IndexError) as e:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping invalid row: {line} - Error: {e}')
                    )
                    continue
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully imported {created_count} feeding bands')
            )
            
        except requests.RequestException as e:
            self.stdout.write(
                self.style.ERROR(f'Error fetching data from Google Sheets: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing data: {e}')
            )
