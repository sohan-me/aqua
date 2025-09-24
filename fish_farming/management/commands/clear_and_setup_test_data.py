from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

from fish_farming.models import (
    # Core models
    PaymentTerms, Customer, Vendor, ItemCategory, Account, Item, StockEntry,
    # Transaction models
    Bill, BillLine, Invoice, InvoiceLine, CustomerStock,
    InventoryTransaction, InventoryTransactionLine,
    # Pond models
    Pond, Species, StockingEvent, StockingLine,
    # Feed models
    FeedingEvent, FeedingLine,
    # Other models
    ExpenseType, IncomeType, Expense, Income
)


class Command(BaseCommand):
    help = 'Clear all data and create comprehensive test data for feed flow testing'

    def handle(self, *args, **options):
        self.stdout.write('Starting data clearing and test data creation...')
        
        # Clear all data first
        self.clear_all_data()
        
        # Create test data
        self.create_test_data()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully cleared data and created test data!')
        )

    def clear_all_data(self):
        """Clear all data from the database"""
        self.stdout.write('Clearing all existing data...')
        
        # Clear in reverse dependency order
        models_to_clear = [
            # Transaction lines first
            InvoiceLine, BillLine, InventoryTransactionLine, StockingLine, FeedingLine,
            # Then transactions
            Invoice, Bill, InventoryTransaction, StockingEvent, FeedingEvent,
            # Customer stock
            CustomerStock,
            # Stock entries
            StockEntry,
            # Items and accounts
            Item, Account,
            # Customers and vendors
            Customer, Vendor,
            # Ponds and species
            Pond, Species,
            # Other models
            ExpenseType, IncomeType, Expense, Income, PaymentTerms, ItemCategory,
        ]
        
        for model in models_to_clear:
            count = model.objects.count()
            if count > 0:
                model.objects.all().delete()
                self.stdout.write(f'  Cleared {count} {model.__name__} records')
        
        # Clear users except superuser
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write('  Cleared non-superuser accounts')

    def create_test_data(self):
        """Create comprehensive test data"""
        self.stdout.write('Creating test data...')
        
        # Create users
        self.create_users()
        
        # Create basic data
        self.create_basic_data()
        
        # Create feed items
        self.create_feed_items()
        
        # Create vendors and customers
        self.create_vendors_customers()
        
        # Create ponds
        self.create_ponds()
        
        # Create bills (purchases)
        self.create_bills()
        
        # Create invoices (sales)
        self.create_invoices()
        
        # Create customer stock
        self.create_customer_stock()

    def create_users(self):
        """Create test users"""
        self.stdout.write('Creating users...')
        
        # Create admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@aqua.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('  Created admin user')
        
        # Create farmer user
        farmer_user, created = User.objects.get_or_create(
            username='farmer',
            defaults={
                'email': 'farmer@aqua.com',
                'first_name': 'John',
                'last_name': 'Farmer',
                'is_staff': False,
                'is_superuser': False
            }
        )
        if created:
            farmer_user.set_password('farmer123')
            farmer_user.save()
            self.stdout.write('  Created farmer user')

    def create_basic_data(self):
        """Create basic master data"""
        self.stdout.write('Creating basic data...')
        
        admin_user = User.objects.get(username='admin')
        
        # Create payment terms
        PaymentTerms.objects.get_or_create(
            name='Net 30',
            defaults={'day_count': 30, 'description': 'Payment due within 30 days'}
        )
        PaymentTerms.objects.get_or_create(
            name='Due on Receipt',
            defaults={'day_count': 0, 'description': 'Payment due immediately'}
        )
        
        # Create item categories
        feed_category, _ = ItemCategory.objects.get_or_create(
            user=admin_user,
            name='Feed',
            defaults={'description': 'Fish feed and nutrition products'}
        )
        
        medicine_category, _ = ItemCategory.objects.get_or_create(
            user=admin_user,
            name='Medicine',
            defaults={'description': 'Fish medicine and treatment products'}
        )
        
        # Create accounts
        Account.objects.get_or_create(
            user=admin_user,
            name='Inventory Feed',
            defaults={
                'account_type': 'Asset',
                'description': 'Feed inventory account'
            }
        )
        
        Account.objects.get_or_create(
            user=admin_user,
            name='Accounts Payable',
            defaults={
                'account_type': 'Liability',
                'description': 'Amounts owed to vendors'
            }
        )
        
        Account.objects.get_or_create(
            user=admin_user,
            name='Accounts Receivable',
            defaults={
                'account_type': 'Asset',
                'description': 'Amounts owed by customers'
            }
        )
        
        Account.objects.get_or_create(
            user=admin_user,
            name='Sales Revenue',
            defaults={
                'account_type': 'Income',
                'description': 'Revenue from sales'
            }
        )
        
        self.stdout.write('  Created payment terms, categories, and accounts')

    def create_feed_items(self):
        """Create feed items"""
        self.stdout.write('Creating feed items...')
        
        admin_user = User.objects.get(username='admin')
        
        # Create Grower Feed
        grower_feed, created = Item.objects.get_or_create(
            user=admin_user,
            name='Grower Feed',
            defaults={
                'item_type': 'inventory_part',
                'category': 'feed',
                'current_stock': Decimal('0.000'),
                'min_stock_level': Decimal('10.000'),
                'max_stock_level': Decimal('100.000'),
                'selling_price': Decimal('120.00'),
                'description': 'High protein feed for growing fish',
                'active': True
            }
        )
        
        # Create Starter Feed
        starter_feed, created = Item.objects.get_or_create(
            user=admin_user,
            name='Starter Feed',
            defaults={
                'item_type': 'inventory_part',
                'category': 'feed',
                'current_stock': Decimal('0.000'),
                'min_stock_level': Decimal('5.000'),
                'max_stock_level': Decimal('50.000'),
                'selling_price': Decimal('100.00'),
                'description': 'Starter feed for young fish',
                'active': True
            }
        )
        
        # Create Medicine
        medicine, created = Item.objects.get_or_create(
            user=admin_user,
            name='Fish Medicine',
            defaults={
                'item_type': 'inventory_part',
                'category': 'medicine',
                'current_stock': Decimal('0.000'),
                'min_stock_level': Decimal('1.000'),
                'max_stock_level': Decimal('10.000'),
                'selling_price': Decimal('50.00'),
                'description': 'General fish medicine',
                'active': True
            }
        )
        
        self.stdout.write('  Created feed items and medicine')

    def create_vendors_customers(self):
        """Create vendors and customers"""
        self.stdout.write('Creating vendors and customers...')
        
        admin_user = User.objects.get(username='admin')
        net_30_terms = PaymentTerms.objects.get(name='Net 30')
        
        # Create vendors
        vendor1, created = Vendor.objects.get_or_create(
            user=admin_user,
            name='Feed Supplier Ltd',
            defaults={
                'contact_person': 'John Supplier',
                'phone': '+1234567890',
                'email': 'supplier@feed.com',
                'address': '123 Supplier Street, City',
                'terms_default': net_30_terms,
                'active': True
            }
        )
        
        vendor2, created = Vendor.objects.get_or_create(
            user=admin_user,
            name='Medicine Supplier',
            defaults={
                'contact_person': 'Dr. Medicine',
                'phone': '+1234567891',
                'email': 'medicine@supplier.com',
                'address': '456 Medicine Ave, City',
                'terms_default': net_30_terms,
                'active': True
            }
        )
        
        # Create customers
        customer1, created = Customer.objects.get_or_create(
            user=admin_user,
            name='Fish Farm Customer',
            defaults={
                'type': 'external_buyer',
                'contact_person': 'Jane Customer',
                'phone': '+1234567892',
                'email': 'customer@fishfarm.com',
                'address': '789 Customer Road, City',
                'status': 'active'
            }
        )
        
        customer2, created = Customer.objects.get_or_create(
            user=admin_user,
            name='Local Fish Market',
            defaults={
                'type': 'external_buyer',
                'contact_person': 'Bob Market',
                'phone': '+1234567893',
                'email': 'market@local.com',
                'address': '321 Market Street, City',
                'status': 'active'
            }
        )
        
        self.stdout.write('  Created vendors and customers')

    def create_ponds(self):
        """Create ponds"""
        self.stdout.write('Creating ponds...')
        
        admin_user = User.objects.get(username='admin')
        customer1 = Customer.objects.get(name='Fish Farm Customer')
        
        # Create species
        tilapia, created = Species.objects.get_or_create(
            user=admin_user,
            name='Nile Tilapia',
            defaults={
                'scientific_name': 'Oreochromis niloticus',
                'description': 'Common tilapia species',
                'optimal_temp_min': 26,
                'optimal_temp_max': 32,
                'optimal_ph_min': Decimal('6.5'),
                'optimal_ph_max': Decimal('8.5')
            }
        )
        
        # Create ponds
        pond1, created = Pond.objects.get_or_create(
            user=admin_user,
            name='Main Production Pond',
            defaults={
                'water_area_decimal': Decimal('25.00'),
                'depth_ft': Decimal('5.00'),
                'volume_m3': Decimal('1000.00'),
                'is_active': True,
                'notes': 'Main production pond for tilapia'
            }
        )
        
        pond2, created = Pond.objects.get_or_create(
            user=admin_user,
            name='Nursery Pond',
            defaults={
                'water_area_decimal': Decimal('10.00'),
                'depth_ft': Decimal('3.00'),
                'volume_m3': Decimal('300.00'),
                'is_active': True,
                'notes': 'Nursery pond for young fish'
            }
        )
        
        self.stdout.write('  Created ponds and species')

    def create_bills(self):
        """Create bills (purchases) to test stock calculations"""
        self.stdout.write('Creating bills (purchases)...')
        
        admin_user = User.objects.get(username='admin')
        vendor1 = Vendor.objects.get(name='Feed Supplier Ltd')
        grower_feed = Item.objects.get(name='Grower Feed')
        starter_feed = Item.objects.get(name='Starter Feed')
        medicine = Item.objects.get(name='Fish Medicine')
        
        # Bill 1: Purchase 2 packets of Grower Feed (10kg each = 20kg total)
        bill1, created = Bill.objects.get_or_create(
            user=admin_user,
            vendor=vendor1,
            bill_no='BILL-001',
            defaults={
                'bill_date': date.today() - timedelta(days=10),
                'due_date': date.today() + timedelta(days=20),
                'total_amount': Decimal('2400.00'),
                'open_balance': Decimal('2400.00'),
                'memo': 'Initial feed purchase - 2 packets of Grower Feed'
            }
        )
        
        if created:
            # Create bill line for 2 packets of Grower Feed
            bill_line1 = BillLine.objects.create(
                bill=bill1,
                is_item=True,
                item=grower_feed,
                description='Grower Feed - 2 packets',
                qty=Decimal('2.000'),
                unit='packet',
                packet_size=Decimal('10.000'),  # 10kg per packet
                cost=Decimal('1200.00'),  # $1200 per packet
                line_amount=Decimal('2400.00')
            )
            
            # Create stock entry for this bill line
            StockEntry.objects.create(
                user=admin_user,
                item=grower_feed,
                quantity=Decimal('20.000'),  # 2 packets * 10kg per packet
                unit='kg',
                packet_size=Decimal('10.000'),
                unit_cost=Decimal('1200.00'),
                total_cost=Decimal('2400.00'),
                entry_date=bill1.bill_date,
                supplier=vendor1.name,
                batch_number=f"BILL-{bill1.bill_no}",
                notes=f"Received from {vendor1.name} via Bill {bill1.bill_no} (2.000 packet)"
            )
            
            self.stdout.write('  Created Bill 1: 2 packets Grower Feed (20kg)')
        
        # Bill 2: Purchase additional 10kg of Grower Feed
        bill2, created = Bill.objects.get_or_create(
            user=admin_user,
            vendor=vendor1,
            bill_no='BILL-002',
            defaults={
                'bill_date': date.today() - timedelta(days=5),
                'due_date': date.today() + timedelta(days=25),
                'total_amount': Decimal('1200.00'),
                'open_balance': Decimal('1200.00'),
                'memo': 'Additional feed purchase - 10kg Grower Feed'
            }
        )
        
        if created:
            # Create bill line for 10kg of Grower Feed
            bill_line2 = BillLine.objects.create(
                bill=bill2,
                is_item=True,
                item=grower_feed,
                description='Grower Feed - 10kg',
                qty=Decimal('10.000'),
                unit='kg',
                cost=Decimal('120.00'),  # $120 per kg
                line_amount=Decimal('1200.00')
            )
            
            # Create stock entry for this bill line
            StockEntry.objects.create(
                user=admin_user,
                item=grower_feed,
                quantity=Decimal('10.000'),  # 10kg
                unit='kg',
                unit_cost=Decimal('120.00'),
                total_cost=Decimal('1200.00'),
                entry_date=bill2.bill_date,
                supplier=vendor1.name,
                batch_number=f"BILL-{bill2.bill_no}",
                notes=f"Received from {vendor1.name} via Bill {bill2.bill_no}"
            )
            
            self.stdout.write('  Created Bill 2: 10kg Grower Feed')
        
        # Bill 3: Purchase Starter Feed
        bill3, created = Bill.objects.get_or_create(
            user=admin_user,
            vendor=vendor1,
            bill_no='BILL-003',
            defaults={
                'bill_date': date.today() - timedelta(days=3),
                'due_date': date.today() + timedelta(days=27),
                'total_amount': Decimal('1000.00'),
                'open_balance': Decimal('1000.00'),
                'memo': 'Starter feed purchase'
            }
        )
        
        if created:
            # Create bill line for 10kg of Starter Feed
            bill_line3 = BillLine.objects.create(
                bill=bill3,
                is_item=True,
                item=starter_feed,
                description='Starter Feed - 10kg',
                qty=Decimal('10.000'),
                unit='kg',
                cost=Decimal('100.00'),  # $100 per kg
                line_amount=Decimal('1000.00')
            )
            
            # Create stock entry for this bill line
            StockEntry.objects.create(
                user=admin_user,
                item=starter_feed,
                quantity=Decimal('10.000'),  # 10kg
                unit='kg',
                unit_cost=Decimal('100.00'),
                total_cost=Decimal('1000.00'),
                entry_date=bill3.bill_date,
                supplier=vendor1.name,
                batch_number=f"BILL-{bill3.bill_no}",
                notes=f"Received from {vendor1.name} via Bill {bill3.bill_no}"
            )
            
            self.stdout.write('  Created Bill 3: 10kg Starter Feed')
        
        # Bill 4: Purchase Medicine
        bill4, created = Bill.objects.get_or_create(
            user=admin_user,
            vendor=vendor1,
            bill_no='BILL-004',
            defaults={
                'bill_date': date.today() - timedelta(days=2),
                'due_date': date.today() + timedelta(days=28),
                'total_amount': Decimal('500.00'),
                'open_balance': Decimal('500.00'),
                'memo': 'Medicine purchase'
            }
        )
        
        if created:
            # Create bill line for 10ml of Medicine
            bill_line4 = BillLine.objects.create(
                bill=bill4,
                is_item=True,
                item=medicine,
                description='Fish Medicine - 10ml',
                qty=Decimal('10.000'),
                unit='ml',
                cost=Decimal('50.00'),  # $50 per ml
                line_amount=Decimal('500.00')
            )
            
            # Create stock entry for this bill line
            StockEntry.objects.create(
                user=admin_user,
                item=medicine,
                quantity=Decimal('10.000'),  # 10ml
                unit='ml',
                unit_cost=Decimal('50.00'),
                total_cost=Decimal('500.00'),
                entry_date=bill4.bill_date,
                supplier=vendor1.name,
                batch_number=f"BILL-{bill4.bill_no}",
                notes=f"Received from {vendor1.name} via Bill {bill4.bill_no}"
            )
            
            self.stdout.write('  Created Bill 4: 10ml Medicine')

    def create_invoices(self):
        """Create invoices (sales) to test stock deductions"""
        self.stdout.write('Creating invoices (sales)...')
        
        admin_user = User.objects.get(username='admin')
        customer1 = Customer.objects.get(name='Fish Farm Customer')
        grower_feed = Item.objects.get(name='Grower Feed')
        starter_feed = Item.objects.get(name='Starter Feed')
        
        # Invoice 1: Sell 10kg of Grower Feed
        invoice1, created = Invoice.objects.get_or_create(
            user=admin_user,
            customer=customer1,
            invoice_no='INV-001',
            defaults={
                'invoice_date': date.today() - timedelta(days=1),
                'total_amount': Decimal('1200.00'),
                'open_balance': Decimal('1200.00'),
                'memo': 'Sale of 10kg Grower Feed to customer'
            }
        )
        
        if created:
            # Create invoice line for 10kg of Grower Feed
            invoice_line1 = InvoiceLine.objects.create(
                invoice=invoice1,
                item=grower_feed,
                description='Grower Feed - 10kg',
                qty=Decimal('10.000'),
                rate=Decimal('120.00'),  # $120 per kg
                amount=Decimal('1200.00')
            )
            
            # Create negative stock entry for this invoice line (deduction)
            StockEntry.objects.create(
                user=admin_user,
                item=grower_feed,
                quantity=Decimal('-10.000'),  # Negative quantity for deduction
                unit='pcs',  # Using pcs as per the view logic
                unit_cost=Decimal('120.00'),
                total_cost=Decimal('-1200.00'),
                entry_date=invoice1.invoice_date,
                supplier=f"SOLD TO {customer1.name}",
                batch_number=f"INVOICE-{invoice1.invoice_no}",
                notes=f"Sold to {customer1.name} via Invoice {invoice1.invoice_no}"
            )
            
            self.stdout.write('  Created Invoice 1: Sold 10kg Grower Feed')
        
        # Invoice 2: Sell 5kg of Starter Feed
        invoice2, created = Invoice.objects.get_or_create(
            user=admin_user,
            customer=customer1,
            invoice_no='INV-002',
            defaults={
                'invoice_date': date.today(),
                'total_amount': Decimal('500.00'),
                'open_balance': Decimal('500.00'),
                'memo': 'Sale of 5kg Starter Feed to customer'
            }
        )
        
        if created:
            # Create invoice line for 5kg of Starter Feed
            invoice_line2 = InvoiceLine.objects.create(
                invoice=invoice2,
                item=starter_feed,
                description='Starter Feed - 5kg',
                qty=Decimal('5.000'),
                rate=Decimal('100.00'),  # $100 per kg
                amount=Decimal('500.00')
            )
            
            # Create negative stock entry for this invoice line (deduction)
            StockEntry.objects.create(
                user=admin_user,
                item=starter_feed,
                quantity=Decimal('-5.000'),  # Negative quantity for deduction
                unit='pcs',  # Using pcs as per the view logic
                unit_cost=Decimal('100.00'),
                total_cost=Decimal('-500.00'),
                entry_date=invoice2.invoice_date,
                supplier=f"SOLD TO {customer1.name}",
                batch_number=f"INVOICE-{invoice2.invoice_no}",
                notes=f"Sold to {customer1.name} via Invoice {invoice2.invoice_no}"
            )
            
            self.stdout.write('  Created Invoice 2: Sold 5kg Starter Feed')

    def create_customer_stock(self):
        """Create customer stock records"""
        self.stdout.write('Creating customer stock...')
        
        admin_user = User.objects.get(username='admin')
        customer1 = Customer.objects.get(name='Fish Farm Customer')
        pond1 = Pond.objects.get(name='Main Production Pond')
        grower_feed = Item.objects.get(name='Grower Feed')
        starter_feed = Item.objects.get(name='Starter Feed')
        
        # Create customer stock for Grower Feed (10kg from invoice)
        customer_stock1, created = CustomerStock.objects.get_or_create(
            user=admin_user,
            customer=customer1,
            pond=pond1,
            item=grower_feed,
            defaults={
                'current_stock': Decimal('10.000'),
                'min_stock_level': Decimal('5.000'),
                'max_stock_level': Decimal('50.000'),
                'unit': 'kg',
                'unit_cost': Decimal('120.00')
            }
        )
        
        # Create customer stock for Starter Feed (5kg from invoice)
        customer_stock2, created = CustomerStock.objects.get_or_create(
            user=admin_user,
            customer=customer1,
            pond=pond1,
            item=starter_feed,
            defaults={
                'current_stock': Decimal('5.000'),
                'min_stock_level': Decimal('2.000'),
                'max_stock_level': Decimal('20.000'),
                'unit': 'kg',
                'unit_cost': Decimal('100.00')
            }
        )
        
        self.stdout.write('  Created customer stock records')
        
        # Display summary
        self.display_summary()

    def display_summary(self):
        """Display summary of created data"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write('TEST DATA SUMMARY')
        self.stdout.write('='*50)
        
        # Items summary
        grower_feed = Item.objects.get(name='Grower Feed')
        starter_feed = Item.objects.get(name='Starter Feed')
        medicine = Item.objects.get(name='Fish Medicine')
        
        self.stdout.write(f'\nITEMS & SERVICES:')
        self.stdout.write(f'  Grower Feed: {grower_feed.current_stock} kg')
        self.stdout.write(f'  Starter Feed: {starter_feed.current_stock} kg')
        self.stdout.write(f'  Medicine: {medicine.current_stock} ml')
        
        # Bills summary
        bills = Bill.objects.all()
        self.stdout.write(f'\nBILLS (ACCOUNTS PAYABLE): {bills.count()} bills')
        for bill in bills:
            self.stdout.write(f'  {bill.bill_no}: ${bill.total_amount} (Balance: ${bill.open_balance})')
        
        # Invoices summary
        invoices = Invoice.objects.all()
        self.stdout.write(f'\nINVOICES (ACCOUNTS RECEIVABLE): {invoices.count()} invoices')
        for invoice in invoices:
            self.stdout.write(f'  {invoice.invoice_no}: ${invoice.total_amount} (Balance: ${invoice.open_balance})')
        
        # Customer stock summary
        customer_stocks = CustomerStock.objects.all()
        self.stdout.write(f'\nCUSTOMER STOCK: {customer_stocks.count()} records')
        for stock in customer_stocks:
            self.stdout.write(f'  {stock.customer.name} - {stock.item.name}: {stock.current_stock} {stock.unit}')
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Expected Stock Calculations:')
        self.stdout.write('  Grower Feed: 20kg (Bill1) + 10kg (Bill2) - 10kg (Invoice1) = 20kg')
        self.stdout.write('  Starter Feed: 10kg (Bill3) - 5kg (Invoice2) = 5kg')
        self.stdout.write('  Medicine: 10ml (Bill4) - 0ml (no sales) = 10ml')
        self.stdout.write('='*50)
