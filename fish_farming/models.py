from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from decimal import Decimal
from mptt.models import MPTTModel, TreeForeignKey


# ===================== CORE MASTER DATA =====================

class PaymentTerms(models.Model):
    """Payment terms for bills and invoices"""
    terms_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True, help_text="e.g., Net 30, Due on receipt")
    day_count = models.PositiveIntegerField(help_text="Number of days for payment")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Payment Terms'

    def __str__(self):
        return self.name


class Customer(models.Model):
    """Customer model - includes own ponds & 3rd-party buyers"""
    CUSTOMER_TYPE_CHOICES = [
        ('internal_pond', 'Internal Pond'),
        ('external_buyer', 'External Buyer'),
    ]
    
    customer_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=200, help_text="e.g., Digonta, Mynuddin, Ashari-1, Ashari-2")
    type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES)
    pond = models.ForeignKey('Pond', on_delete=models.CASCADE, null=True, blank=True, related_name='customers', help_text="Required for Internal Pond type")
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ], default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"




class Vendor(models.Model):
    """Vendor model for suppliers"""
    vendor_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendors')
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    memo = models.TextField(blank=True)
    terms_default = models.ForeignKey(PaymentTerms, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendors')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class ItemCategory(MPTTModel):
    """Hierarchical item categories for organizing items"""
    item_category_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class MPTTMeta:
        order_insertion_by = ['name']
    
    class Meta:
        verbose_name = 'Item Category'
        verbose_name_plural = 'Item Categories'
        unique_together = ['user', 'name', 'parent']
    
    def __str__(self):
        return self.name


class Account(MPTTModel):
    """Chart of Accounts - Hierarchical structure"""
    ACCOUNT_TYPE_CHOICES = [
        ('Income', 'Income'),
        ('Expense', 'Expense'),
        ('COGS', 'Cost of Goods Sold'),
        ('Bank', 'Bank'),
        ('Credit Card', 'Credit Card'),
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Accounts Payable', 'Accounts Payable'),
        ('Other Current Asset', 'Other Current Asset'),
        ('Other Asset', 'Other Asset'),
        ('Other Current Liability', 'Other Current Liability'),
        ('Long Term Liability', 'Long Term Liability'),
        ('Equity', 'Equity'),
        ('Fixed Asset', 'Fixed Asset'),
        ('Other Income', 'Other Income'),
        ('Other Expense', 'Other Expense'),
    ]
    
    account_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True)
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPE_CHOICES)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class MPTTMeta:
        order_insertion_by = ['account_type', 'code', 'name']
    
    class Meta:
        ordering = ['tree_id', 'lft']
        unique_together = ['user', 'name', 'parent']  # Same name allowed at different levels
    
    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name
    
    def get_full_path(self):
        """Get the full path from root to this account"""
        ancestors = self.get_ancestors(include_self=True)
        return ' > '.join([f"{ancestor.code} - {ancestor.name}" if ancestor.code else ancestor.name for ancestor in ancestors])


class Item(models.Model):
    """Items & services (inventory & non-inventory)"""
    ITEM_TYPE_CHOICES = [
        ('inventory_part', 'Inventory Part'),
        ('non_inventory', 'Non-Inventory'),
        ('service', 'Service'),
        ('payment', 'Payment'),
        ('discount', 'Discount'),
    ]
    
    item_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200, help_text="Tilapia, Rui, Feed X, Medicine Y, Net, Boat Rent, etc.")
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    category = models.CharField(max_length=50, blank=True, choices=[
        ('feed', 'Feed'),
        ('medicine', 'Medicine'),
        ('equipment', 'Equipment'),
        ('chemical', 'Chemical'),
        ('fish', 'Fish'),
        ('supplies', 'Supplies'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ])
    unit = models.CharField(max_length=20, default='kg', help_text="Unit of measurement")
    income_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='income_items')
    expense_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='expense_items')
    asset_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='asset_items')
    cost_of_goods_sold_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='cogs_items', help_text="Cost of Goods Sold account")
    
    # Stock management
    current_stock = models.DecimalField(max_digits=15, decimal_places=3, default=0, help_text="Current stock quantity")
    min_stock_level = models.DecimalField(max_digits=15, decimal_places=3, default=0, help_text="Minimum stock level for alerts")
    max_stock_level = models.DecimalField(max_digits=15, decimal_places=3, null=True, blank=True, help_text="Maximum stock level")
    
    # Feed-specific fields
    protein_content = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Protein content % (for feeds)")
    feed_stage = models.CharField(max_length=50, blank=True, help_text="Feed stage: Starter, Grower, Finisher, etc.")
    
    # Pricing
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Cost price per unit")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Selling price per unit")
    
    description = models.TextField(blank=True)

    # Fish aggregation (for fish category only)
    fish_total_weight_kg = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, help_text="Aggregate total fish weight in kg")
    fish_count = models.PositiveIntegerField(null=True, blank=True, help_text="Aggregate number of fish (pieces)")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name
    
    def calculate_current_stock(self):
        """Calculate current stock based on inventory transactions"""
        from django.db.models import Sum
        
        # Sum all inventory transactions for this item
        stock_sum = InventoryTransactionLine.objects.filter(
            item=self
        ).aggregate(
            total_stock=Sum('qty')
        )['total_stock'] or 0
        
        return stock_sum
    
    def update_current_stock(self):
        """Update current_stock field based on inventory transactions"""
        self.current_stock = self.calculate_current_stock()
        self.save(update_fields=['current_stock'])
    
    def is_low_stock(self):
        """Check if item is below minimum stock level"""
        return self.current_stock <= self.min_stock_level
    
    def get_stock_status(self):
        """Get stock status for display"""
        if self.current_stock <= 0:
            return 'out_of_stock'
        elif self.is_low_stock():
            return 'low_stock'
        elif self.max_stock_level and self.current_stock >= self.max_stock_level:
            return 'overstocked'
        else:
            return 'in_stock'
    
    def get_category_display(self):
        """Get the display name for the category"""
        if self.category:
            # Get the display value from the choices
            choices_dict = dict(self._meta.get_field('category').choices)
            return choices_dict.get(self.category, self.category)
        return ''
    
    def get_total_stock_kg(self):
        """Calculate total stock in kg from all stock entries"""
        total_kg = 0
        for entry in self.stock_entries.all():
            if entry.unit in ['packet', 'pack'] and entry.packet_size:
                # Convert packets to kg using entry's packet size
                total_kg += entry.quantity * entry.packet_size
            elif entry.unit == 'kg':
                # Already in kg
                total_kg += entry.quantity
            elif entry.unit == 'pcs':
                # Convert pieces to kg - assuming 1 piece = 1 kg for feed items
                # This is a simplified conversion - in reality, you'd need proper conversion rates
                total_kg += entry.quantity
            elif entry.unit == 'ml':
                # Convert ml to kg - assuming 1 ml = 0.001 kg for medicine
                total_kg += entry.quantity * Decimal('0.001')
            # Add other unit conversions as needed
        return total_kg
    
    def get_total_stock_in_unit(self):
        """Calculate total stock in the item's unit from all stock entries"""
        total_in_unit = 0
        for entry in self.stock_entries.all():
            if entry.unit == self.unit:
                # Same unit, add directly
                total_in_unit += entry.quantity
            elif entry.unit in ['packet', 'pack'] and entry.packet_size and self.unit == 'kg':
                # Convert packets to kg
                total_in_unit += entry.quantity * entry.packet_size
            elif entry.unit == 'ml' and self.unit == 'litre':
                # Convert ml to litres
                total_in_unit += entry.quantity / 1000
            elif entry.unit == 'litre' and self.unit == 'ml':
                # Convert litres to ml
                total_in_unit += entry.quantity * 1000
            elif entry.unit == 'gram' and self.unit == 'kg':
                # Convert grams to kg
                total_in_unit += entry.quantity / 1000
            elif entry.unit == 'kg' and self.unit == 'gram':
                # Convert kg to grams
                total_in_unit += entry.quantity * 1000
            else:
                # For other cases, just add the quantity (simplified)
                total_in_unit += entry.quantity
        return total_in_unit
    
    def get_stock_summary(self):
        """Get a summary of all stock entries"""
        entries = []
        for entry in self.stock_entries.all():
            if entry.unit in ['packet', 'pack'] and entry.packet_size:
                kg_equivalent = entry.quantity * entry.packet_size
                entries.append(f"{entry.quantity} {entry.unit} ({kg_equivalent} kg)")
            else:
                entries.append(f"{entry.quantity} {entry.unit}")
        return entries
    
    def calculate_fish_weight_from_stock(self):
        """Calculate total fish weight and count from stock entries for fish items"""
        if self.category != 'fish':
            return {'total_weight': 0, 'total_count': 0}
        
        total_weight = 0
        total_count = 0
        
        for entry in self.stock_entries.all():
            # Calculate count - prefer explicit fish_count, otherwise use quantity based on unit
            if entry.fish_count is not None:
                # Use explicit fish_count if provided (this is the most accurate)
                total_count += entry.fish_count
            elif entry.unit == 'piece':
                # For piece-based entries without fish_count, use quantity
                total_count += int(entry.quantity)
            elif entry.unit == 'kg':
                # For kg-based entries without fish_count, estimate from weight
                if hasattr(self, 'average_fish_weight_kg') and self.average_fish_weight_kg:
                    total_count += int(entry.quantity / self.average_fish_weight_kg)
                else:
                    # Default assumption: 1 kg = 4 pieces
                    total_count += int(entry.quantity * Decimal('4'))
            
            # Calculate weight - use calculated_weight_kg if available, otherwise estimate
            if entry.calculated_weight_kg is not None:
                # Use the calculated weight from the entry
                total_weight += entry.calculated_weight_kg
            elif entry.unit == 'piece':
                # For piece-based entries, estimate weight from pieces
                piece_count = entry.fish_count if entry.fish_count is not None else entry.quantity
                if hasattr(self, 'average_fish_weight_kg') and self.average_fish_weight_kg:
                    total_weight += piece_count * self.average_fish_weight_kg
                else:
                    # Default assumption: 1 piece = 0.25 kg
                    total_weight += piece_count * Decimal('0.25')
            elif entry.unit == 'kg':
                # If stock entry is in kg, use quantity as weight
                total_weight += entry.quantity
        
        return {'total_weight': total_weight, 'total_count': int(total_count)}
    
    def update_fish_aggregation(self):
        """Update fish_total_weight_kg and fish_count from stock entries"""
        if self.category == 'fish':
            fish_data = self.calculate_fish_weight_from_stock()
            self.fish_total_weight_kg = fish_data['total_weight']
            self.fish_count = fish_data['total_count']
            self.save(update_fields=['fish_total_weight_kg', 'fish_count'])


class StockEntry(models.Model):
    """Individual stock entries for items - allows multiple stock additions"""
    entry_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stock_entries')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='stock_entries')
    quantity = models.DecimalField(max_digits=15, decimal_places=3, help_text="Quantity added")
    unit = models.CharField(max_length=20, help_text="Unit of measurement")
    packet_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Packet size in kg (e.g., 10, 25)")
    gallon_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Gallon size in litres (e.g., 5, 10, 20)")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Cost per unit")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Total cost for this entry")
    entry_date = models.DateField(help_text="Date when stock was added")
    supplier = models.CharField(max_length=200, blank=True, help_text="Supplier name")
    batch_number = models.CharField(max_length=100, blank=True, help_text="Batch or lot number")
    expiry_date = models.DateField(null=True, blank=True, help_text="Expiry date if applicable")
    notes = models.TextField(blank=True)
    # Fish-specific optional info for fish items
    fish_count = models.IntegerField(null=True, blank=True, help_text="Number of fish (pieces) for fish items")
    calculated_weight_kg = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True, help_text="Calculated weight in kg for fish items")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-entry_date', '-created_at']
        verbose_name = 'Stock Entry'
        verbose_name_plural = 'Stock Entries'
    
    def __str__(self):
        return f"{self.item.name} - {self.quantity} {self.unit} ({self.entry_date})"
    
    def get_kg_equivalent(self):
        """Get the kg equivalent of this stock entry"""
        if self.unit in ['packet', 'pack'] and self.packet_size:
            return self.quantity * self.packet_size
        elif self.unit == 'kg':
            return self.quantity
        else:
            return 0  # Unknown unit conversion
    
    def calculate_fish_weight(self):
        """Calculate weight for fish items"""
        if self.item.category == 'fish':
            if self.unit == 'piece':
                # For piece-based entries, use fish_count if available, otherwise use quantity
                piece_count = self.fish_count if self.fish_count else self.quantity
                # Default assumption: 1 piece = 0.25 kg (this should be configurable)
                return piece_count * Decimal('0.25')
            elif self.unit == 'kg':
                # Use quantity directly for kg-based entries
                return self.quantity
            else:
                return Decimal('0')
        return Decimal('0')
    
    def update_calculated_weight(self):
        """Update the calculated_weight_kg field"""
        if self.item.category == 'fish':
            self.calculated_weight_kg = self.calculate_fish_weight()
            self.save(update_fields=['calculated_weight_kg'])
    
    def save(self, *args, **kwargs):
        # Auto-calculate total cost
        if self.unit_cost and self.quantity:
            self.total_cost = self.unit_cost * self.quantity
        
        # Auto-calculate fish weight for fish items
        if self.item and self.item.category == 'fish':
            self.calculated_weight_kg = self.calculate_fish_weight()
        
        super().save(*args, **kwargs)


class ItemPrice(models.Model):
    """Item pricing"""
    item_price_id = models.AutoField(primary_key=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='prices')
    effective_date = models.DateField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='BDT')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-effective_date']
        unique_together = ['item', 'effective_date']
    
    def __str__(self):
        return f"{self.item.name} - {self.price} ({self.effective_date})"


# ===================== ACCOUNTING MODELS =====================

class JournalEntry(models.Model):
    """Journal Entry - backbone for full audit trail"""
    SOURCE_CHOICES = [
        ('BILL', 'Bill'),
        ('BILL_PAYMENT', 'Bill Payment'),
        ('INVOICE', 'Invoice'),
        ('CUST_PAYMENT', 'Customer Payment'),
        ('DEPOSIT', 'Deposit'),
        ('TRANSFER', 'Transfer'),
        ('CHECK', 'Check'),
        ('INVENTORY', 'Inventory'),
        ('STOCKING_FEED_MED', 'Stocking/Feed/Medicine'),
        ('PAYROLL', 'Payroll'),
        ('MANUAL', 'Manual Entry'),
    ]
    
    je_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    date = models.DateField()
    memo = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_id = models.PositiveIntegerField(null=True, blank=True, help_text="ID of the source document")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'Journal Entries'
    
    def __str__(self):
        return f"JE-{self.je_id} ({self.date}) - {self.get_source_display()}"


class JournalLine(models.Model):
    """Journal Line - individual debit/credit entries"""
    jl_id = models.AutoField(primary_key=True)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='journal_lines')
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Optional references for job costing
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_lines')
    
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['journal_entry', 'jl_id']
    
    def __str__(self):
        return f"JL-{self.jl_id} - {self.account.name} (D:{self.debit} C:{self.credit})"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        if self.debit > 0 and self.credit > 0:
            raise ValidationError("A journal line cannot have both debit and credit amounts")
        if self.debit == 0 and self.credit == 0:
            raise ValidationError("A journal line must have either a debit or credit amount")


class Bill(models.Model):
    """Accounts Payable - Bills"""
    bill_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bills')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='bills')
    bill_no = models.CharField(max_length=100, help_text="Auto-generated bill number")
    bill_date = models.DateField()
    due_date = models.DateField()
    terms = models.ForeignKey(PaymentTerms, on_delete=models.SET_NULL, null=True, blank=True)
    memo = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    open_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-bill_date', '-created_at']
    
    def get_next_bill_number(self):
        """Get the next auto-generated bill number for this user"""
        last_bill = Bill.objects.filter(user=self.user).order_by('-bill_id').first()
        if last_bill and last_bill.bill_no.isdigit():
            return str(int(last_bill.bill_no) + 1)
        else:
            return "1"
    
    def save(self, *args, **kwargs):
        # Auto-generate bill number if not provided
        if not self.bill_no:
            self.bill_no = self.get_next_bill_number()
        else:
            # If bill_no is provided, check for duplicates within the same user
            existing_bill = Bill.objects.filter(
                user=self.user, 
                bill_no=self.bill_no
            ).exclude(bill_id=self.bill_id).first()
            if existing_bill:
                raise ValueError(f"Bill number '{self.bill_no}' already exists for this user.")
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Bill-{self.bill_id} - {self.vendor.name} ({self.bill_date})"


class BillLine(models.Model):
    """Bill Line Items"""
    bill_line_id = models.AutoField(primary_key=True)
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='lines')
    is_item = models.BooleanField(default=False, help_text="True if this line is for an item, False for expense")
    
    # Expense mode fields
    expense_account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True, related_name='bill_expense_lines')
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='bill_expense_lines')
    
    # Item mode fields
    item = models.ForeignKey(Item, on_delete=models.CASCADE, null=True, blank=True, related_name='bill_lines')
    description = models.CharField(max_length=200, blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True, help_text="Unit of measurement (kg, packet, pieces, etc.)")
    packet_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Packet size in kg")
    gallon_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Gallon size in litres")
    cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    line_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Fish-specific fields for item lines
    species = models.ForeignKey('Species', on_delete=models.SET_NULL, null=True, blank=True, related_name='bill_lines', help_text="Species for fish items")
    total_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Total weight in kg for fish items")
    fish_count = models.PositiveIntegerField(null=True, blank=True, help_text="Number of fish (pieces)")
    body_weight_per_fish = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Average body weight (kg) per fish")
    line_number = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Line number (pcs per kg) for fish items")
    
    line_memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['bill', 'bill_line_id']
    
    def __str__(self):
        if self.is_item:
            return f"{self.item.name} - {self.qty} @ {self.cost}"
        else:
            return f"{self.expense_account.name} - {self.amount}"

    def save(self, *args, **kwargs):
        # Auto-calculate line_amount for item lines
        if self.is_item and self.item and self.cost is not None:
            if self.item.category == 'fish':
                effective_qty = None
                # For fish items, determine quantity based on unit of measurement
                if self.unit == 'piece' and self.fish_count:
                    # When selling by piece, use fish_count
                    effective_qty = self.fish_count
                elif self.total_weight and self.total_weight > 0:
                    # When selling by weight, use total_weight
                    effective_qty = self.total_weight
                elif self.fish_count and self.body_weight_per_fish:
                    # Fallback: calculate from fish_count and body_weight_per_fish
                    effective_qty = self.fish_count * self.body_weight_per_fish
                else:
                    # Final fallback to qty
                    effective_qty = self.qty or 0
            else:
                # For non-fish items, use qty directly
                # packet_size is only for display/weight calculation, not for pricing
                effective_qty = self.qty or 0
            self.line_amount = effective_qty * self.cost
        super().save(*args, **kwargs)


class BillPayment(models.Model):
    """Bill Payments"""
    bill_payment_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bill_payments')
    payment_date = models.DateField()
    payment_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='bill_payments')
    memo = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"Bill Payment-{self.bill_payment_id} ({self.payment_date})"


class BillPaymentApply(models.Model):
    """Bill Payment Applications - many bills per payment"""
    bill_payment_apply_id = models.AutoField(primary_key=True)
    bill_payment = models.ForeignKey(BillPayment, on_delete=models.CASCADE, related_name='applies')
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payment_applies')
    amount_applied = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['bill_payment', 'bill']
        unique_together = ['bill_payment', 'bill']
    
    def __str__(self):
        return f"Apply {self.amount_applied} to Bill-{self.bill.bill_id}"


class Invoice(models.Model):
    """Accounts Receivable - Invoices"""
    invoice_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    invoice_no = models.CharField(max_length=100, help_text="Auto-generated invoice number")
    invoice_date = models.DateField()
    terms = models.ForeignKey(PaymentTerms, on_delete=models.SET_NULL, null=True, blank=True)
    memo = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    open_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-invoice_date', '-created_at']
        unique_together = ['user', 'invoice_no']
    
    def __str__(self):
        return f"Invoice-{self.invoice_no} - {self.customer.name} ({self.invoice_date})"
    
    def save(self, *args, **kwargs):
        if not self.invoice_no:
            # Auto-generate invoice number
            last_invoice = Invoice.objects.filter(user=self.user).order_by('-invoice_id').first()
            if last_invoice and last_invoice.invoice_no.isdigit():
                next_num = int(last_invoice.invoice_no) + 1
            else:
                next_num = 1
            self.invoice_no = str(next_num).zfill(6)
        super().save(*args, **kwargs)


class InvoiceLine(models.Model):
    """Invoice Line Items"""
    invoice_line_id = models.AutoField(primary_key=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='invoice_lines')
    description = models.CharField(max_length=200, blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, blank=True, help_text="Unit of measurement (kg, packet, pieces, etc.)")
    packet_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Packet size in kg")
    gallon_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Gallon size in litres")
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Fish-specific fields
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice_lines', help_text="Pond for fish items")
    species = models.ForeignKey('Species', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice_lines', help_text="Species for fish items")
    total_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Total weight in kg for fish items")
    fish_count = models.PositiveIntegerField(null=True, blank=True, help_text="Number of fish (pieces)")
    body_weight_per_fish = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Average body weight (kg) per fish")
    line_number = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Line number (pcs per kg) for fish items")
    fish_unit = models.CharField(max_length=10, choices=[('kg', 'Per kg'), ('piece', 'Per piece')], null=True, blank=True, help_text="Unit for fish pricing calculation (required for fish items)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['invoice', 'invoice_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.qty} @ {self.rate}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate amount
        # For fish items: use different calculation based on fish_unit
        if self.item and self.item.category == 'fish':
            # Set default fish_unit if not specified for fish items
            if not self.fish_unit:
                self.fish_unit = 'kg'
                
            if self.fish_unit == 'piece':
                # For piece pricing: use fish_count
                effective_qty = self.fish_count or 0
            else:
                # For kg pricing: prefer explicit total_weight; otherwise derive from fish_count * body_weight_per_fish
                if self.total_weight and self.total_weight > 0:
                    effective_qty = self.total_weight
                elif self.fish_count and self.body_weight_per_fish:
                    effective_qty = self.fish_count * self.body_weight_per_fish
                else:
                    effective_qty = self.qty or 0
        else:
            # For non-fish items: use quantity directly
            effective_qty = self.qty or 0
        
        self.amount = effective_qty * self.rate
        super().save(*args, **kwargs)


class CustomerPayment(models.Model):
    """Customer Payments"""
    cust_payment_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_payments')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments')
    payment_date = models.DateField()
    amount_total = models.DecimalField(max_digits=12, decimal_places=2)
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"Payment-{self.cust_payment_id} - {self.customer.name} ({self.payment_date})"


class CustomerPaymentApply(models.Model):
    """Customer Payment Applications"""
    cust_payment_apply_id = models.AutoField(primary_key=True)
    customer_payment = models.ForeignKey(CustomerPayment, on_delete=models.CASCADE, related_name='applies')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payment_applies')
    amount_applied = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['customer_payment', 'invoice']
        unique_together = ['customer_payment', 'invoice']
    
    def __str__(self):
        return f"Apply {self.amount_applied} to Invoice-{self.invoice.invoice_no}"


class Deposit(models.Model):
    """Deposits - move from Undeposited Funds to Bank"""
    deposit_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deposits')
    deposit_date = models.DateField()
    bank_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='deposits')
    memo = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-deposit_date', '-created_at']
    
    def __str__(self):
        return f"Deposit-{self.deposit_id} ({self.deposit_date})"


class DepositLine(models.Model):
    """Deposit Lines - each line moves a CustomerPayment to Bank account"""
    deposit_line_id = models.AutoField(primary_key=True)
    deposit = models.ForeignKey(Deposit, on_delete=models.CASCADE, related_name='lines')
    customer_payment = models.ForeignKey(CustomerPayment, on_delete=models.CASCADE, related_name='deposit_lines')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['deposit', 'deposit_line_id']
        unique_together = ['deposit', 'customer_payment']
    
    def __str__(self):
        return f"Deposit {self.amount} from Payment-{self.customer_payment.cust_payment_id}"


class Check(models.Model):
    """Checks for payments"""
    PAYEE_TYPE_CHOICES = [
        ('VENDOR', 'Vendor'),
        ('EMPLOYEE', 'Employee'),
        ('OTHER', 'Other'),
    ]
    
    check_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checks')
    check_no = models.CharField(max_length=50, help_text="Auto-generated check number")
    bank_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='checks')
    payee_type = models.CharField(max_length=10, choices=PAYEE_TYPE_CHOICES)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='checks')
    employee = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='checks')
    payee_name = models.CharField(max_length=200, blank=True, help_text="If OTHER")
    check_date = models.DateField()
    address_text = models.TextField(blank=True)
    memo = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-check_date', '-created_at']
        unique_together = ['user', 'check_no']
    
    def __str__(self):
        return f"Check-{self.check_no} ({self.check_date})"
    
    def save(self, *args, **kwargs):
        if not self.check_no:
            # Auto-generate check number
            last_check = Check.objects.filter(user=self.user).order_by('-check_id').first()
            if last_check and last_check.check_no.isdigit():
                next_num = int(last_check.check_no) + 1
            else:
                next_num = 1
            self.check_no = str(next_num).zfill(6)
        super().save(*args, **kwargs)


class CheckExpenseLine(models.Model):
    """Check Expense Lines - if paying expenses directly"""
    check_expense_line_id = models.AutoField(primary_key=True)
    check_obj = models.ForeignKey(Check, on_delete=models.CASCADE, related_name='expense_lines')
    expense_account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='check_expense_lines')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    memo = models.TextField(blank=True)
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='check_expense_lines')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['check_obj', 'check_expense_line_id']
    
    def __str__(self):
        return f"{self.expense_account.name} - {self.amount}"


class CheckItemLine(models.Model):
    """Check Item Lines - if paying for items directly"""
    check_item_line_id = models.AutoField(primary_key=True)
    check_obj = models.ForeignKey(Check, on_delete=models.CASCADE, related_name='item_lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='check_lines')
    description = models.CharField(max_length=200, blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='check_item_lines')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['check_obj', 'check_item_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.qty} @ {self.cost}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate amount
        self.amount = self.qty * self.cost
        super().save(*args, **kwargs)


# ===================== INVENTORY MODELS =====================

class InventoryTransaction(models.Model):
    """Inventory Transactions"""
    TXN_TYPE_CHOICES = [
        ('RECEIPT_WITH_BILL', 'Receipt with Bill'),
        ('RECEIPT_NO_BILL', 'Receipt without Bill'),
        ('ADJUSTMENT', 'Adjustment'),
        ('ISSUE_TO_POND', 'Issue to Pond'),
        ('SALE_TO_CUSTOMER', 'Sale to Customer'),
    ]
    
    inv_txn_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory_transactions')
    txn_type = models.CharField(max_length=20, choices=TXN_TYPE_CHOICES)
    txn_date = models.DateField()
    memo = models.TextField(blank=True)
    
    # Linkage to source documents
    bill = models.ForeignKey(Bill, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    check_obj = models.ForeignKey(Check, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_transactions')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-txn_date', '-created_at']
    
    def __str__(self):
        return f"InvTxn-{self.inv_txn_id} - {self.get_txn_type_display()} ({self.txn_date})"


class InventoryTransactionLine(models.Model):
    """Inventory Transaction Lines"""
    inv_txn_line_id = models.AutoField(primary_key=True)
    inventory_transaction = models.ForeignKey(InventoryTransaction, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='inventory_lines')
    qty = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for receipt, negative for issue")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_lines')
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['inventory_transaction', 'inv_txn_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.qty} @ {self.unit_cost}"
    
    def save(self, *args, **kwargs):
        """Override save to update item stock"""
        super().save(*args, **kwargs)
        # Update the item's current stock
        self.item.update_current_stock()
    
    def delete(self, *args, **kwargs):
        """Override delete to update item stock"""
        super().delete(*args, **kwargs)
        # Update the item's current stock after deletion
        self.item.update_current_stock()


# ===================== ITEM SALES & ISSUES =====================

class ItemSales(models.Model):
    """Item sales/issues from inventory to customers or ponds"""
    SALE_TYPE_CHOICES = [
        ('to_customer', 'To Customer'),
        ('to_pond', 'To Pond'),
        ('internal_use', 'Internal Use'),
    ]
    
    sale_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='item_sales')
    sale_type = models.CharField(max_length=20, choices=SALE_TYPE_CHOICES)
    sale_date = models.DateField()
    
    # Customer (for external sales)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='item_sales')
    
    # Pond (for internal pond usage)
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='item_sales')
    
    # Invoice reference (if sold to customer)
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='item_sales')
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-sale_date', '-created_at']
    
    def __str__(self):
        if self.customer:
            return f"Sale-{self.sale_id} to {self.customer.name} ({self.sale_date})"
        elif self.pond:
            return f"Sale-{self.sale_id} to {self.pond.name} ({self.sale_date})"
        else:
            return f"Sale-{self.sale_id} - Internal Use ({self.sale_date})"


class ItemSalesLine(models.Model):
    """Item sales line items"""
    sale_line_id = models.AutoField(primary_key=True)
    item_sale = models.ForeignKey(ItemSales, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='sales_lines')
    qty = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity sold/issued")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Selling price per unit")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total line amount")
    
    # Inventory transaction link (for automatic deduction)
    inv_txn_line = models.ForeignKey(InventoryTransactionLine, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_lines')
    
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['item_sale', 'sale_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.qty} @ {self.unit_price}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total price
        self.total_price = self.qty * self.unit_price
        super().save(*args, **kwargs)


# ===================== AQUACULTURE OPERATIONS =====================

class StockingEvent(models.Model):
    """Stocking events for fish species only"""
    stocking_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stocking_events')
    pond = models.ForeignKey('Pond', on_delete=models.CASCADE, related_name='stocking_events')
    event_date = models.DateField()
    line_summary = models.TextField(blank=True, help_text="Optional summary of stocking lines")
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-event_date', '-created_at']
    
    def __str__(self):
        return f"Stocking-{self.stocking_id} - {self.pond.name} ({self.event_date})"


class StockingLine(models.Model):
    """Stocking line items"""
    stocking_line_id = models.AutoField(primary_key=True)
    stocking_event = models.ForeignKey(StockingEvent, on_delete=models.CASCADE, related_name='lines')
    species = models.ForeignKey('Species', on_delete=models.CASCADE, related_name='stocking_lines', help_text="Fish species stocked")
    qty_pcs = models.PositiveIntegerField(help_text="Number of pieces stocked")
    pcs_per_kg_at_stocking = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True, help_text="Pieces per kg at stocking")
    weight_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['stocking_event', 'stocking_line_id']
    
    def __str__(self):
        return f"{self.species.name} - {self.qty_pcs} pcs ({self.stocking_event.event_date})"


class FeedingEvent(models.Model):
    """Feeding events for operational logging"""
    feeding_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feeding_events')
    pond = models.ForeignKey('Pond', on_delete=models.CASCADE, related_name='feeding_events')
    feed_item = models.ForeignKey('Item', on_delete=models.CASCADE, null=True, blank=True, related_name='feeding_events', help_text="Feed item used")
    species = models.ForeignKey('Species', on_delete=models.SET_NULL, null=True, blank=True, related_name='feeding_events', help_text="Fish species being fed")
    event_date = models.DateField()
    feeding_time = models.TimeField(null=True, blank=True, help_text="Time of feeding")
    
    # Feed quantity tracking
    packet_qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Number of packets used")
    packet_size = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Size of each packet in kg")
    amount_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Total amount in kg (calculated or direct input)")
    
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-event_date', '-created_at']
    
    
    def __str__(self):
        return f"Feeding-{self.feeding_id} - {self.pond.customer.name} ({self.event_date})"


class FeedingLine(models.Model):
    """Feeding line items"""
    feeding_line_id = models.AutoField(primary_key=True)
    feeding_event = models.ForeignKey(FeedingEvent, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='feeding_lines', help_text="Feed item")
    qty = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity in kg")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Optional water parameters snapshot for AI logic provenance
    water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    water_ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    water_do = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Optional inventory transaction link
    inv_txn_line = models.ForeignKey(InventoryTransactionLine, on_delete=models.SET_NULL, null=True, blank=True, related_name='feeding_lines')
    
    # Customer stock link for pond-specific feeding
    customer_stock = models.ForeignKey('CustomerStock', on_delete=models.SET_NULL, null=True, blank=True, related_name='feeding_lines', help_text="Customer/pond stock used for feeding")
    
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['feeding_event', 'feeding_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.qty}kg ({self.feeding_event.event_date})"
    
    def save(self, *args, **kwargs):
        # Create inventory transaction to deduct feed from inventory
        if not self.inv_txn_line and self.item.is_feed:
            from django.utils import timezone
            
            # Create inventory transaction for feeding
            inv_txn = InventoryTransaction.objects.create(
                user=self.feeding_event.user,
                txn_type='ISSUE_TO_POND',
                txn_date=self.feeding_event.event_date,
                memo=f"Feed issue for {self.feeding_event.pond.name} - {self.item.name}",
            )
            
            # Create inventory transaction line (negative qty for deduction)
            inv_txn_line = InventoryTransactionLine.objects.create(
                inventory_transaction=inv_txn,
                item=self.item,
                qty=-self.qty,  # Negative for deduction
                unit_cost=self.unit_cost or 0,
                pond=self.feeding_event.pond,
                memo=f"Feeding: {self.memo}",
            )
            
            self.inv_txn_line = inv_txn_line
        
        super().save(*args, **kwargs)


class MedicineEvent(models.Model):
    """Medicine events for operational logging"""
    medicine_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medicine_events')
    pond = models.ForeignKey('Pond', on_delete=models.CASCADE, related_name='medicine_events')
    medicine_item = models.ForeignKey('Item', on_delete=models.CASCADE, related_name='medicine_events', null=True, blank=True, help_text="Medicine item applied")
    dosage_amount = models.DecimalField(max_digits=10, decimal_places=3, default=0, help_text="Amount of medicine applied")
    event_date = models.DateField()
    diagnosis_note = models.TextField(blank=True)
    memo = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-event_date', '-created_at']
    
    def __str__(self):
        return f"Medicine Event {self.medicine_id} - {self.pond.name} ({self.event_date})"
    
    def save(self, *args, **kwargs):
        # Handle stock deduction
        if self.pk:  # If this is an update
            old_instance = MedicineEvent.objects.get(pk=self.pk)
            if old_instance.dosage_amount != self.dosage_amount or old_instance.medicine_item != self.medicine_item:
                # Revert old deduction
                self._deduct_stock(old_instance.dosage_amount, old_instance.medicine_item, add=True)
                # Apply new deduction
                self._deduct_stock(self.dosage_amount, self.medicine_item, add=False)
        else:  # If this is a new instance
            self._deduct_stock(self.dosage_amount, self.medicine_item, add=False)
        
        super().save(*args, **kwargs)
    
    def _deduct_stock(self, amount, medicine_item, add=False):
        """Deduct medicine from pond's customer stock"""
        try:
            from .models import CustomerStock, Customer
            
            # Find the customer associated with this pond
            customer = Customer.objects.get(pond=self.pond, type='internal_pond')
            
            # Get customer stock for this medicine
            customer_stock = CustomerStock.objects.filter(
                user=self.user,
                customer=customer,
                pond=self.pond,
                item=medicine_item
            ).first()
            
            if customer_stock:
                if add:
                    customer_stock.current_stock += amount
                else:
                    if customer_stock.current_stock >= amount:
                        customer_stock.current_stock -= amount
                    else:
                        raise ValueError(f"Insufficient stock. Available: {customer_stock.current_stock}, Required: {amount}")
                
                customer_stock.save()
                
                # Create inventory transaction
                from .models import InventoryTransaction, InventoryTransactionLine
                transaction_type = 'MEDICINE_RETURN' if add else 'MEDICINE_CONSUMPTION'
                memo_prefix = 'Returned' if add else 'Applied'
                
                transaction = InventoryTransaction.objects.create(
                    user=self.user,
                    txn_type=transaction_type,
                    txn_date=self.event_date,
                    memo=f"{memo_prefix} {amount} {customer_stock.unit} of {medicine_item.name} in {self.pond.name}",
                )
                
                InventoryTransactionLine.objects.create(
                    inventory_transaction=transaction,
                    item=medicine_item,
                    qty=-amount if not add else amount,
                    unit_cost=customer_stock.unit_cost,
                    memo=f"{memo_prefix} {amount} {customer_stock.unit} of {medicine_item.name} in {self.pond.name}",
                )
                
        except Exception as e:
            print(f"Error handling stock deduction for medicine event {self.medicine_id}: {e}")
            raise


class MedicineLine(models.Model):
    """Medicine line items"""
    medicine_line_id = models.AutoField(primary_key=True)
    medicine_event = models.ForeignKey(MedicineEvent, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='medicine_lines', help_text="Medicine item")
    
    # Medicine Type choices
    MEDICINE_TYPE_CHOICES = [
        ('antibiotic', 'Antibiotic'),
        ('antifungal', 'Antifungal'),
        ('antiparasitic', 'Antiparasitic'),
        ('vitamin', 'Vitamin'),
        ('mineral', 'Mineral'),
        ('probiotic', 'Probiotic'),
        ('disinfectant', 'Disinfectant'),
        ('hormone', 'Hormone'),
        ('other', 'Other'),
    ]
    medicine_type = models.CharField(max_length=50, choices=MEDICINE_TYPE_CHOICES, default='other', help_text="Type of medicine")
    
    # Treatment Type choices
    TREATMENT_TYPE_CHOICES = [
        ('preventive', 'Preventive'),
        ('therapeutic', 'Therapeutic'),
        ('curative', 'Curative'),
        ('prophylactic', 'Prophylactic'),
        ('emergency', 'Emergency'),
        ('routine', 'Routine'),
    ]
    treatment_type = models.CharField(max_length=50, choices=TREATMENT_TYPE_CHOICES, default='therapeutic', help_text="Type of treatment")
    
    # State Type choices
    STATE_TYPE_CHOICES = [
        ('liquid', 'Liquid'),
        ('powder', 'Powder'),
        ('tablet', 'Tablet'),
        ('capsule', 'Capsule'),
        ('injection', 'Injection'),
        ('topical', 'Topical'),
        ('granule', 'Granule'),
        ('other', 'Other'),
    ]
    state_type = models.CharField(max_length=50, choices=STATE_TYPE_CHOICES, default='liquid', help_text="Physical state/form of medicine")
    
    # Dosage information
    dosage = models.CharField(max_length=200, help_text="Dosage information")
    prescribed_dosage = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, help_text="Prescribed dosage amount")
    
    # Dosage Unit choices
    DOSAGE_UNIT_CHOICES = [
        ('mg', 'Milligrams (mg)'),
        ('g', 'Grams (g)'),
        ('kg', 'Kilograms (kg)'),
        ('ml', 'Milliliters (ml)'),
        ('l', 'Liters (L)'),
        ('pieces', 'Pieces'),
        ('tablets', 'Tablets'),
        ('capsules', 'Capsules'),
        ('drops', 'Drops'),
        ('units', 'Units'),
        ('iu', 'International Units (IU)'),
        ('ppm', 'Parts Per Million (ppm)'),
        ('other', 'Other'),
    ]
    dosage_unit = models.CharField(max_length=50, choices=DOSAGE_UNIT_CHOICES, default='ml', help_text="Unit for prescribed dosage")
    
    # Quantity and unit
    qty_used = models.DecimalField(max_digits=10, decimal_places=2, help_text="Quantity used")
    
    # Unit of Measure choices (same as dosage units for consistency)
    UNIT_OF_MEASURE_CHOICES = [
        ('mg', 'Milligrams (mg)'),
        ('g', 'Grams (g)'),
        ('kg', 'Kilograms (kg)'),
        ('ml', 'Milliliters (ml)'),
        ('l', 'Liters (L)'),
        ('pieces', 'Pieces'),
        ('tablets', 'Tablets'),
        ('capsules', 'Capsules'),
        ('drops', 'Drops'),
        ('units', 'Units'),
        ('iu', 'International Units (IU)'),
        ('ppm', 'Parts Per Million (ppm)'),
        ('other', 'Other'),
    ]
    unit_of_measure = models.CharField(max_length=50, choices=UNIT_OF_MEASURE_CHOICES, default='ml', help_text="Unit of measure for quantity")
    
    # Cost
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Cost per unit")
    
    # Inventory transaction link
    inv_txn_line = models.ForeignKey(InventoryTransactionLine, on_delete=models.SET_NULL, null=True, blank=True, related_name='medicine_lines')
    
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['medicine_event', 'medicine_line_id']
    
    def __str__(self):
        return f"{self.item.name} - {self.dosage} ({self.medicine_event.event_date})"
    
    def save(self, *args, **kwargs):
        """Override save to handle inventory management and invoicing"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new and self.qty_used > 0:
            self._create_inventory_transaction()
            self._create_invoice_if_needed()
    
    def _create_inventory_transaction(self):
        """Create inventory transaction to reduce stock"""
        from django.utils import timezone
        
        # Create inventory transaction for medicine usage
        inv_txn = InventoryTransaction.objects.create(
            user=self.medicine_event.user,
            txn_type='ISSUE_TO_POND',
            txn_date=self.medicine_event.event_date,
            memo=f"Medicine issue for {self.medicine_event.pond.name} - {self.item.name}",
        )
        
        # Create inventory transaction line (negative qty for deduction)
        inv_txn_line = InventoryTransactionLine.objects.create(
            inventory_transaction=inv_txn,
            item=self.item,
            qty=-self.qty_used,  # Negative for deduction
            unit_cost=self.unit_cost or 0,
            pond=self.medicine_event.pond
        )
        
        # Link the inventory transaction line
        self.inv_txn_line = inv_txn_line
        super().save(update_fields=['inv_txn_line'])
    
    def _create_invoice_if_needed(self):
        """Create invoice for medicine usage if configured"""
        # Check if invoicing is enabled for this medicine event
        # This could be controlled by a setting or configuration
        if hasattr(self.medicine_event, 'create_invoice') and self.medicine_event.create_invoice:
            self._generate_invoice()
    
    def _generate_invoice(self):
        """Generate invoice for medicine usage"""
        from django.utils import timezone
        
        # Check if pond has a customer (this would need to be added to Pond model)
        # For now, we'll create a default customer or skip invoice generation
        customer = getattr(self.medicine_event.pond, 'customer', None)
        
        if not customer:
            # Create a default customer for internal pond usage
            from fish_farming.models import Customer
            customer, created = Customer.objects.get_or_create(
                user=self.medicine_event.user,
                name=f"Internal - {self.medicine_event.pond.name}",
                defaults={
                    'type': 'internal',
                    'phone': '',
                    'email': '',
                    'address': 'Internal pond usage'
                }
            )
        
        # Create invoice for the pond/customer
        invoice = Invoice.objects.create(
            user=self.medicine_event.user,
            customer=customer,
            invoice_date=self.medicine_event.event_date,
            due_date=self.medicine_event.event_date,  # Could be calculated based on payment terms
            memo=f"Medicine treatment for {self.medicine_event.pond.name}",
            status='draft'
        )
        
        # Create invoice line for the medicine
        InvoiceLine.objects.create(
            invoice=invoice,
            item=self.item,
            description=f"{self.item.name} - {self.dosage}",
            qty=self.qty_used,
            unit_price=self.unit_cost or 0,
            pond=self.medicine_event.pond
        )
        
        return invoice


class OtherPondEvent(models.Model):
    """Other pond events - dynamic activities"""
    other_event_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='other_pond_events')
    pond = models.ForeignKey('Pond', on_delete=models.CASCADE, related_name='other_events')
    event_date = models.DateField()
    category = models.CharField(max_length=100, help_text="Free text/tag for event category")
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-event_date', '-created_at']
    
    def __str__(self):
        return f"Event-{self.other_event_id} - {self.pond.customer.name} ({self.category})"


class OtherPondEventLine(models.Model):
    """Other pond event line items (optional)"""
    other_event_line_id = models.AutoField(primary_key=True)
    other_event = models.ForeignKey(OtherPondEvent, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='other_event_lines')
    qty = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    memo = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['other_event', 'other_event_line_id']
    
    def __str__(self):
        item_name = self.item.name if self.item else "General"
        return f"{item_name} - {self.amount} ({self.other_event.category})"


# ===================== EMPLOYEE & PAYROLL MODELS =====================

class Employee(models.Model):
    """Employee management"""
    employee_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employees')
    name = models.CharField(max_length=200)
    join_date = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('terminated', 'Terminated'),
    ], default='active')
    # Additional fields for frontend compatibility
    employee_number = models.CharField(max_length=50, blank=True)
    position = models.CharField(max_length=100, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Original fields
    salary_base = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    bonus_rules = models.TextField(blank=True)
    benefits_profile = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name


class EmployeeDocument(models.Model):
    """Employee documents"""
    employee_document_id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    doc_type = models.CharField(max_length=100, help_text="contract, NID, degree, etc.")
    file_ref = models.CharField(max_length=500, help_text="File reference/path")
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['employee', 'doc_type']
    
    def __str__(self):
        return f"{self.employee.name} - {self.doc_type}"


class PayrollRun(models.Model):
    """Payroll runs"""
    payroll_run_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payroll_runs')
    period_start = models.DateField()
    period_end = models.DateField()
    pay_date = models.DateField()
    memo = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('paid', 'Paid'),
    ], default='draft')
    total_gross = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_benefits = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_net = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-pay_date', '-created_at']
    
    def __str__(self):
        return f"Payroll-{self.payroll_run_id} ({self.period_start} to {self.period_end})"


class PayrollLine(models.Model):
    """Payroll line items - Bangladesh Private Company Structure"""
    payroll_line_id = models.AutoField(primary_key=True)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='lines')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_lines')
    
    # Core Salary (Full Salary - Bangladesh Private Company)
    full_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Fixed monthly agreed salary")
    
    # Additions (Earnings)
    overtime_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0, help_text="Overtime hours worked")
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Overtime pay (Gross ÷ 208 × 2 × OT hours)")
    harvest_incentive = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Harvest incentive (Kg × Rate)")
    festival_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Festival bonus (Eid bonuses)")
    performance_bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Performance/Attendance bonus")
    
    # Deductions
    absent_days = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Days absent")
    absent_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Absent deduction (Gross ÷ 30 × absent days)")
    loan_advance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Loan/Advance repayment")
    pf_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Provident Fund (Employee contribution)")
    tax_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Tax (PAYE) as per NBR slab")
    
    # Employer Contributions (for reporting)
    pf_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Provident Fund (Employer contribution)")
    gratuity = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Gratuity/Service benefit")
    insurance_welfare = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Insurance/Welfare fund")
    
    # Calculated Fields
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total earnings (Full salary + additions)")
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total deductions")
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Net pay to employee")
    
    # Payment Details
    payment_account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_lines')
    check_obj = models.ForeignKey(Check, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_lines')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['payroll_run', 'employee']
        unique_together = ['payroll_run', 'employee']
    
    def __str__(self):
        return f"{self.employee.name} - {self.net_pay} ({self.payroll_run.pay_date})"
    
    def save(self, *args, **kwargs):
        # Calculate Bangladesh Private Company Payroll Structure
        
        # Calculate overtime pay (Gross ÷ 208 × 2 × OT hours)
        if self.overtime_hours > 0:
            hourly_rate = self.full_salary / 208  # 208 hours per month
            self.overtime_pay = hourly_rate * 2 * self.overtime_hours
        
        # Calculate absent deduction (Gross ÷ 30 × absent days)
        if self.absent_days > 0:
            daily_rate = self.full_salary / 30
            self.absent_deduction = daily_rate * self.absent_days
        
        # Calculate total earnings
        self.total_earnings = (
            self.full_salary + 
            self.overtime_pay + 
            self.harvest_incentive + 
            self.festival_bonus + 
            self.performance_bonus
        )
        
        # Calculate total deductions
        self.total_deductions = (
            self.absent_deduction + 
            self.loan_advance + 
            self.pf_employee + 
            self.tax_paye
        )
        
        # Calculate net pay
        self.net_pay = self.total_earnings - self.total_deductions
        
        super().save(*args, **kwargs)


# ===================== ORIGINAL MODELS (Updated) =====================

class Pond(models.Model):
    """Pond management model"""
    pond_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ponds')
    name = models.CharField(max_length=100, default="Untitled Pond", help_text="Pond name")
    water_area_decimal = models.DecimalField(max_digits=8, decimal_places=3, help_text="Area in decimal units (1 decimal = 40.46 m²)")
    depth_ft = models.DecimalField(max_digits=6, decimal_places=2, help_text="Depth in feet")
    volume_m3 = models.DecimalField(max_digits=10, decimal_places=3, help_text="Volume in cubic meters")
    location = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # Leasing information
    leasing_date = models.DateField(null=True, blank=True, help_text="Date when pond was leased")
    leasing_end_date = models.DateField(null=True, blank=True, help_text="Date when pond leasing ends")
    rate_per_decimal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Leasing rate per decimal")
    total_leasing_money = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Total leasing amount (auto-calculated: area × rate)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} - Pond"
    
    @property
    def area_sqm(self):
        """Convert decimal area to square meters"""
        if isinstance(self.water_area_decimal, (int, float)):
            area_decimal_decimal = Decimal(str(self.water_area_decimal))
        else:
            area_decimal_decimal = self.water_area_decimal
        return area_decimal_decimal * Decimal('40.46')
    
    def save(self, *args, **kwargs):
        # Auto-calculate volume: Area (decimal converted to m²) × Depth (ft converted to m)
        # Convert feet to meters: 1 foot = 0.3048 meters
        # Convert decimal to m²: 1 decimal = 40.46 m²
        if isinstance(self.depth_ft, (int, float)):
            depth_ft_decimal = Decimal(str(self.depth_ft))
        else:
            depth_ft_decimal = self.depth_ft
        
        if isinstance(self.water_area_decimal, (int, float)):
            area_decimal_decimal = Decimal(str(self.water_area_decimal))
        else:
            area_decimal_decimal = self.water_area_decimal
            
        depth_m = depth_ft_decimal * Decimal('0.3048')
        area_sqm = area_decimal_decimal * Decimal('40.46')
        self.volume_m3 = area_sqm * depth_m
        super().save(*args, **kwargs)


class Species(MPTTModel):
    """Fish species model with hierarchical structure"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='species')
    name = models.CharField(max_length=100)
    scientific_name = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True)
    optimal_temp_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    optimal_temp_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    optimal_ph_min = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    optimal_ph_max = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class MPTTMeta:
        order_insertion_by = ['name']
    
    class Meta:
        verbose_name_plural = 'Species'
        unique_together = ['user', 'name']
    
    def __str__(self):
        return self.name
    
    def get_full_path(self):
        """Get the full hierarchical path of the species"""
        ancestors = self.get_ancestors(include_self=True)
        return ' > '.join([ancestor.name for ancestor in ancestors])


class Stocking(models.Model):
    """Fish stocking records - based on the sheet data"""
    stocking_id = models.AutoField(primary_key=True)
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='stockings')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='stockings')
    date = models.DateField()
    pcs = models.PositiveIntegerField(help_text="Number of pieces stocked")
    pieces_per_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True, help_text="Pieces per kg")
    total_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, default=0, help_text="Total weight in kg")
    initial_avg_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, default=0, help_text="Initial average weight in kg")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['pond', 'species', 'date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.species.name} ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate pieces_per_kg if pcs and total_weight_kg are provided
        if self.pcs and self.total_weight_kg and self.total_weight_kg > 0:
            self.pieces_per_kg = self.pcs / self.total_weight_kg
        
        # Auto-calculate initial_avg_weight_kg if we have both pcs and total_weight_kg
        if self.pcs and self.total_weight_kg and self.total_weight_kg > 0:
            self.initial_avg_weight_kg = self.total_weight_kg / self.pcs
        
        # Auto-calculate total_weight_kg and initial_avg_weight_kg if pieces_per_kg is provided but total_weight_kg is not
        elif self.pcs and self.pieces_per_kg and (not self.total_weight_kg or self.total_weight_kg == 0):
            self.total_weight_kg = self.pcs / self.pieces_per_kg
            self.initial_avg_weight_kg = self.total_weight_kg / self.pcs
        
        super().save(*args, **kwargs)


class DailyLog(models.Model):
    """Daily operations log"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    weather = models.CharField(max_length=100, blank=True)
    
    # Legacy single water quality measurements (kept for backward compatibility)
    water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # New 4-direction water quality measurements
    # East side measurements
    east_water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="East Water Temperature (°C)")
    east_ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name="East pH")
    east_dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="East Dissolved Oxygen (mg/L)")
    east_ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="East Ammonia (mg/L)")
    east_nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="East Nitrite (mg/L)")
    
    # West side measurements
    west_water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="West Water Temperature (°C)")
    west_ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name="West pH")
    west_dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="West Dissolved Oxygen (mg/L)")
    west_ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="West Ammonia (mg/L)")
    west_nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="West Nitrite (mg/L)")
    
    # North side measurements
    north_water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="North Water Temperature (°C)")
    north_ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name="North pH")
    north_dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="North Dissolved Oxygen (mg/L)")
    north_ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="North Ammonia (mg/L)")
    north_nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="North Nitrite (mg/L)")
    
    # South side measurements
    south_water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="South Water Temperature (°C)")
    south_ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name="South pH")
    south_dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="South Dissolved Oxygen (mg/L)")
    south_ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="South Ammonia (mg/L)")
    south_nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="South Nitrite (mg/L)")
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['pond', 'date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.date}"


class FeedType(models.Model):
    """Feed type model"""
    name = models.CharField(max_length=100, unique=True)
    protein_content = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Protein content %")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Feed(models.Model):
    """Feed management"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='feeds')
    feed_type = models.ForeignKey(FeedType, on_delete=models.CASCADE, related_name='feeds')
    date = models.DateField()
    amount_kg = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    feeding_time = models.TimeField(null=True, blank=True)
    
    # Feed consumption tracking
    packet_size_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Size of each packet in kg (e.g., 15kg, 25kg)")
    cost_per_packet = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Cost per packet of feed")
    cost_per_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Cost per kg of feed")
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Total cost for this feeding")
    consumption_rate_kg_per_day = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Daily consumption rate in kg")
    biomass_at_feeding_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Estimated fish biomass at time of feeding")
    feeding_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Feeding rate as % of biomass")
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.feed_type.name} ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total cost based on input method
        if self.cost_per_packet and self.packet_size_kg and not self.total_cost:
            # Calculate cost when using packets
            if isinstance(self.amount_kg, (int, float)):
                amount_kg_decimal = Decimal(str(self.amount_kg))
            else:
                amount_kg_decimal = self.amount_kg
            if isinstance(self.cost_per_packet, (int, float)):
                cost_per_packet_decimal = Decimal(str(self.cost_per_packet))
            else:
                cost_per_packet_decimal = self.cost_per_packet
            if isinstance(self.packet_size_kg, (int, float)):
                packet_size_decimal = Decimal(str(self.packet_size_kg))
            else:
                packet_size_decimal = self.packet_size_kg
            
            packets_used = amount_kg_decimal / packet_size_decimal
            self.total_cost = packets_used * cost_per_packet_decimal
        elif self.cost_per_kg and not self.total_cost:
            # Calculate cost when using kg directly
            if isinstance(self.amount_kg, (int, float)):
                amount_kg_decimal = Decimal(str(self.amount_kg))
            else:
                amount_kg_decimal = self.amount_kg
            if isinstance(self.cost_per_kg, (int, float)):
                cost_per_kg_decimal = Decimal(str(self.cost_per_kg))
            else:
                cost_per_kg_decimal = self.cost_per_kg
            
            self.total_cost = cost_per_kg_decimal * amount_kg_decimal
        
        # Auto-calculate feeding rate if biomass is provided
        if self.biomass_at_feeding_kg and self.amount_kg:
            if isinstance(self.amount_kg, (int, float)):
                amount_kg_decimal = Decimal(str(self.amount_kg))
            else:
                amount_kg_decimal = self.amount_kg
            if isinstance(self.biomass_at_feeding_kg, (int, float)):
                biomass_decimal = Decimal(str(self.biomass_at_feeding_kg))
            else:
                biomass_decimal = self.biomass_at_feeding_kg
            self.feeding_rate_percent = (amount_kg_decimal / biomass_decimal) * 100
        
        super().save(*args, **kwargs)


class SampleType(models.Model):
    """Sample type model for water quality samples"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='test-tube', help_text="Icon name for UI display")
    color = models.CharField(max_length=20, default='blue', help_text="Color theme for UI display")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Sample Type'
        verbose_name_plural = 'Sample Types'
    
    def __str__(self):
        return self.name


class Sampling(models.Model):
    """Water and fish sampling records"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='samplings')
    date = models.DateField()
    sample_type = models.ForeignKey(SampleType, on_delete=models.CASCADE, related_name='samplings')
    ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    nitrate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    alkalinity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hardness = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    turbidity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fish_weight_g = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fish_length_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.sample_type.name} ({self.date})"


class Mortality(models.Model):
    """Mortality tracking"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='mortalities')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='mortalities', null=True, blank=True)
    date = models.DateField()
    count = models.PositiveIntegerField()
    avg_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True)
    total_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True)
    cause = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Mortalities'
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} - {self.count} fish ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate avg_weight_kg from latest fish sampling data if not provided
        if not self.avg_weight_kg and self.pond and self.species:
            # Get latest fish sampling data for this pond and species
            latest_sampling = FishSampling.objects.filter(
                pond=self.pond, 
                species=self.species
            ).order_by('-date').first()
            
            if latest_sampling and latest_sampling.average_weight_kg:
                self.avg_weight_kg = latest_sampling.average_weight_kg
            else:
                # Fallback: get from latest stocking data
                latest_stocking = Stocking.objects.filter(
                    pond=self.pond, 
                    species=self.species
                ).order_by('-date').first()
                
                if latest_stocking and latest_stocking.initial_avg_weight_kg:
                    self.avg_weight_kg = latest_stocking.initial_avg_weight_kg
        
        # Auto-calculate total_weight_kg
        if self.count and self.avg_weight_kg:
            self.total_weight_kg = self.count * self.avg_weight_kg
        
        super().save(*args, **kwargs)


class Harvest(models.Model):
    """Harvest records"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='harvests')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='harvests', null=True, blank=True)
    date = models.DateField()
    total_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, validators=[MinValueValidator(Decimal('0.01'))])
    pieces_per_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True, help_text="Pieces per kg")
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, default=0)
    total_count = models.PositiveIntegerField(null=True, blank=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} - {self.total_weight_kg}kg ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate pieces_per_kg if total_count and total_weight_kg are provided
        if self.total_count and self.total_weight_kg and self.total_weight_kg > 0 and not self.pieces_per_kg:
            self.pieces_per_kg = self.total_count / self.total_weight_kg
        
        # Auto-calculate avg_weight_kg and total_count if pieces_per_kg is provided
        if self.total_weight_kg and self.pieces_per_kg:
            self.avg_weight_kg = Decimal('1') / self.pieces_per_kg
            if not self.total_count:
                self.total_count = int(self.total_weight_kg * self.pieces_per_kg)
        
        # Auto-calculate revenue if price is provided
        if self.price_per_kg and not self.total_revenue:
            self.total_revenue = self.total_weight_kg * self.price_per_kg
        super().save(*args, **kwargs)


class ExpenseType(MPTTModel):
    """Expense type model with hierarchical categories"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expense_types')
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class MPTTMeta:
        order_insertion_by = ['category']
    
    class Meta:
        ordering = ['category']
        unique_together = ['user', 'category', 'parent']
        verbose_name = 'Expense Type'
        verbose_name_plural = 'Expense Types'
    
    def __str__(self):
        return self.category
    
    def get_full_path(self):
        """Get the full path from root to this expense type"""
        ancestors = self.get_ancestors(include_self=True)
        return ' > '.join([ancestor.category for ancestor in ancestors])


class IncomeType(MPTTModel):
    """Income type model with hierarchical categories"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='income_types')
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class MPTTMeta:
        order_insertion_by = ['category']
    
    class Meta:
        ordering = ['category']
        unique_together = ['user', 'category', 'parent']
        verbose_name = 'Income Type'
        verbose_name_plural = 'Income Types'
    
    def __str__(self):
        return self.category
    
    def get_full_path(self):
        """Get the full path from root to this income type"""
        ancestors = self.get_ancestors(include_self=True)
        return ' > '.join([ancestor.category for ancestor in ancestors])


class Expense(models.Model):
    """Expense tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    expense_type = models.ForeignKey(ExpenseType, on_delete=models.CASCADE, related_name='expenses')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    supplier = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.expense_type.name} - ৳{self.amount} ({self.date})"


class Income(models.Model):
    """Income tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incomes')
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='incomes', null=True, blank=True)
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='incomes', null=True, blank=True)
    income_type = models.ForeignKey(IncomeType, on_delete=models.CASCADE, related_name='incomes')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    customer = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.income_type.category} - ৳{self.amount} ({self.date})"


class InventoryFeed(models.Model):
    """Feed inventory management"""
    feed_type = models.ForeignKey(FeedType, on_delete=models.CASCADE, related_name='inventory')
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=200, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['feed_type__name']
    
    def __str__(self):
        return f"{self.feed_type.name} - {self.quantity_kg}kg"


class Treatment(models.Model):
    """Treatment records"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='treatments')
    date = models.DateField()
    treatment_type = models.CharField(max_length=100)
    product_name = models.CharField(max_length=200)
    dosage = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.treatment_type} ({self.date})"


class Alert(models.Model):
    """Alert system"""
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.pond.name} - {self.alert_type} ({self.severity})"


class Setting(models.Model):
    """System settings"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settings')
    key = models.CharField(max_length=100)
    value = models.TextField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['key']
        unique_together = ['user', 'key']
    
    def __str__(self):
        return f"{self.user.username} - {self.key}"


class FeedingBand(models.Model):
    """Feeding schedule bands"""
    name = models.CharField(max_length=100)
    min_weight_g = models.DecimalField(max_digits=10, decimal_places=2)
    max_weight_g = models.DecimalField(max_digits=10, decimal_places=2)
    feeding_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, help_text="Feeding rate as % of body weight")
    frequency_per_day = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['min_weight_g']
    
    def __str__(self):
        return f"{self.name} ({self.min_weight_g}-{self.max_weight_g}g)"


class EnvAdjustment(models.Model):
    """Environmental adjustments"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='env_adjustments')
    date = models.DateField()
    adjustment_type = models.CharField(max_length=100, choices=[
        ('water_change', 'Water Change'),
        ('ph_adjustment', 'pH Adjustment'),
        ('temperature_control', 'Temperature Control'),
        ('aeration', 'Aeration'),
        ('other', 'Other'),
    ])
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.adjustment_type} ({self.date})"


class KPIDashboard(models.Model):
    """Key Performance Indicators Dashboard"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='kpis')
    date = models.DateField()
    
    # Growth metrics
    avg_weight_g = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_biomass_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    survival_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Feed metrics
    feed_conversion_ratio = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    daily_feed_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Water quality metrics
    water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Financial metrics
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    profit_loss = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['pond', 'date']
    
    def __str__(self):
        return f"{self.pond.name} - KPIs ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate profit/loss
        if self.total_income is not None and self.total_expenses is not None:
            self.profit_loss = self.total_income - self.total_expenses
        super().save(*args, **kwargs)


class FishSampling(models.Model):
    """Fish sampling for growth monitoring"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='fish_samplings')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='fish_samplings', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fish_samplings')
    date = models.DateField()
    
    # Sampling data
    sample_size = models.PositiveIntegerField(help_text="Number of fish sampled")
    total_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, help_text="Total weight of sampled fish in kg")
    average_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, default=0, help_text="Average weight per fish in kg")
    fish_per_kg = models.DecimalField(max_digits=15, decimal_places=10, help_text="Number of fish per kg")
    
    # Growth metrics
    growth_rate_kg_per_day = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True, help_text="Daily growth rate in kg")
    biomass_difference_kg = models.DecimalField(max_digits=15, decimal_places=10, null=True, blank=True, help_text="Total biomass difference from previous sampling in kg")
    condition_factor = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, help_text="Fish condition factor")
    
    # Notes and observations
    notes = models.TextField(blank=True, help_text="Observations and notes about the sampling")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} Sampling ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate derived metrics
        from decimal import Decimal, InvalidOperation, DivisionByZero
        try:
            # Ensure Decimal arithmetic with proper precision
            sample_size_dec = Decimal(str(self.sample_size)) if self.sample_size is not None else None
            total_weight_dec = Decimal(str(self.total_weight_kg)) if self.total_weight_kg is not None else None
            if sample_size_dec and total_weight_dec and total_weight_dec > 0:
                # average_weight_kg = total_weight / sample_size
                self.average_weight_kg = (total_weight_dec / sample_size_dec).quantize(Decimal('0.0000000001'))
                # fish_per_kg (aka line number) = sample_size / total_weight
                self.fish_per_kg = (sample_size_dec / total_weight_dec).quantize(Decimal('0.0000000001'))
                # condition_factor: simple proxy using g/fish (avg kg * 1000)
                try:
                    self.condition_factor = (self.average_weight_kg * Decimal('1000')).quantize(Decimal('0.001'))
                except Exception:
                    pass
        except (InvalidOperation, DivisionByZero, Exception):
            # Leave fields as-is if calculation fails
            pass
        super().save(*args, **kwargs)
        if self.total_weight_kg and self.sample_size:
            # Calculate average weight in kg
            self.average_weight_kg = self.total_weight_kg / self.sample_size
            
            # Calculate fish per kg
            self.fish_per_kg = self.sample_size / self.total_weight_kg
            
            # Calculate condition factor (simplified version)
            if self.average_weight_kg:
                self.condition_factor = self.average_weight_kg * 1000  # Simplified calculation
        
        # Always calculate growth rate before saving
        self.calculate_growth_rate()
        
        super().save(*args, **kwargs)
    
    def calculate_growth_rate(self):
        """Calculate daily growth rate and biomass difference based on previous sampling or initial stocking"""
        # Get the previous sampling for the same pond
        # If species is specified, try to find same species first, otherwise any species
        if self.species:
            # First try to find previous sampling with same species
            previous_sampling = FishSampling.objects.filter(
                pond=self.pond,
                species=self.species,
                date__lt=self.date
            ).order_by('-date').first()
            
            # If no same species found, look for any previous sampling in the same pond
            if not previous_sampling:
                previous_sampling = FishSampling.objects.filter(
                    pond=self.pond,
                    date__lt=self.date
                ).order_by('-date').first()
        else:
            # If no species specified, look for any previous sampling in the same pond
            previous_sampling = FishSampling.objects.filter(
                pond=self.pond,
                date__lt=self.date
            ).order_by('-date').first()
        
        # If no previous sampling found, compare with initial stocking data
        if not previous_sampling:
            # This is the first sampling - compare with initial stocking
            if self.species:
                # Find the most recent stocking for this pond and species
                latest_stocking = Stocking.objects.filter(
                    pond=self.pond,
                    species=self.species
                ).order_by('-date').first()
            else:
                # Find the most recent stocking for this pond (any species)
                latest_stocking = Stocking.objects.filter(
                    pond=self.pond
                ).order_by('-date').first()
            
            if latest_stocking and latest_stocking.total_weight_kg and latest_stocking.pcs:
                # Calculate days since stocking
                days_diff = (self.date - latest_stocking.date).days
                
                if days_diff > 0:
                    # Calculate initial average weight from stocking
                    initial_avg_weight = float(latest_stocking.total_weight_kg) / float(latest_stocking.pcs)
                    
                    # Calculate weight difference per fish
                    weight_diff = float(self.average_weight_kg) - initial_avg_weight
                    
                    # Calculate daily growth rate (can be positive or negative)
                    growth_rate_value = weight_diff / days_diff
                    self.growth_rate_kg_per_day = Decimal(str(growth_rate_value))
                    
                    # Calculate total biomass difference
                    # Use current fish count (stocked - mortality - harvested)
                    total_fish_count = self.estimate_total_fish_count()
                    if total_fish_count:
                        self.biomass_difference_kg = Decimal(str(weight_diff * total_fish_count))
                    else:
                        self.biomass_difference_kg = None
                else:
                    self.growth_rate_kg_per_day = None
                    self.biomass_difference_kg = None
            else:
                self.growth_rate_kg_per_day = None
                self.biomass_difference_kg = None
        else:
            # Compare with previous sampling
            if previous_sampling.average_weight_kg:
                # Calculate days difference
                days_diff = (self.date - previous_sampling.date).days
                
                if days_diff > 0:
                    # Calculate weight difference per fish
                    weight_diff = float(self.average_weight_kg) - float(previous_sampling.average_weight_kg)
                    
                    # Calculate daily growth rate (can be positive or negative)
                    self.growth_rate_kg_per_day = Decimal(str(weight_diff / days_diff))
                    
                    # Calculate total biomass difference
                    # Estimate total fish count in pond based on stocking and mortality data
                    total_fish_count = self.estimate_total_fish_count()
                    if total_fish_count:
                        self.biomass_difference_kg = Decimal(str(weight_diff * total_fish_count))
                    else:
                        self.biomass_difference_kg = None
                else:
                    self.growth_rate_kg_per_day = None
                    self.biomass_difference_kg = None
            else:
                self.growth_rate_kg_per_day = None
                self.biomass_difference_kg = None
    
    def estimate_total_fish_count(self):
        """Estimate total fish count in pond based on stocking, mortality, and harvest data"""
        try:
            # Get total stocked fish for this species (or all species if no species specified)
            if self.species:
                total_stocked = Stocking.objects.filter(pond=self.pond, species=self.species).aggregate(
                    total=models.Sum('pcs')
                )['total'] or 0
                
                # Get total mortality for this species
                total_mortality = Mortality.objects.filter(pond=self.pond, species=self.species).aggregate(
                    total=models.Sum('count')
                )['total'] or 0
                
                # Get total harvested for this species
                total_harvested = Harvest.objects.filter(pond=self.pond, species=self.species).aggregate(
                    total=models.Sum('total_count')
                )['total'] or 0
            else:
                # If no species specified, use all species in the pond
                total_stocked = Stocking.objects.filter(pond=self.pond).aggregate(
                    total=models.Sum('pcs')
                )['total'] or 0
                
                # Get total mortality
                total_mortality = Mortality.objects.filter(pond=self.pond).aggregate(
                    total=models.Sum('count')
                )['total'] or 0
                
                # Get total harvested
                total_harvested = Harvest.objects.filter(pond=self.pond).aggregate(
                    total=models.Sum('total_count')
                )['total'] or 0
            
            # Calculate current alive fish
            current_alive = total_stocked - total_mortality - total_harvested
            
            return max(0, current_alive)
        except Exception:
            return None


class FeedingAdvice(models.Model):
    """AI-powered feeding advice based on fish growth and conditions"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='feeding_advice')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='feeding_advice', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feeding_advice')
    date = models.DateField()
    
    # Medical diagnostic integration
    medical_diagnostics = models.ManyToManyField(
        'MedicalDiagnostic', 
        blank=True, 
        related_name='feeding_advice',
        help_text="Related medical diagnostics that influenced this feeding advice"
    )
    medical_considerations = models.TextField(
        blank=True, 
        help_text="Medical considerations and adjustments made to feeding advice"
    )
    medical_warnings = models.JSONField(
        default=list, 
        help_text="Medical warnings and recommendations for this feeding advice"
    )
    
    # Fish data
    estimated_fish_count = models.PositiveIntegerField(help_text="Estimated number of fish in pond")
    average_fish_weight_kg = models.DecimalField(max_digits=15, decimal_places=10, default=0, help_text="Average fish weight in kg")
    total_biomass_kg = models.DecimalField(max_digits=15, decimal_places=10, help_text="Total fish biomass in kg")
    
    # Feeding recommendations
    recommended_feed_kg = models.DecimalField(max_digits=8, decimal_places=2, help_text="Recommended daily feed amount in kg")
    feeding_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, help_text="Feeding rate as % of biomass")
    feeding_frequency = models.PositiveIntegerField(default=2, help_text="Recommended feeding frequency per day")
    
    # Environmental factors
    water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Water temperature in Celsius")
    season = models.CharField(max_length=20, choices=[
        ('spring', 'Spring'),
        ('summer', 'Summer'),
        ('autumn', 'Autumn'),
        ('winter', 'Winter'),
    ], default='summer')
    
    # Feed type and cost
    feed_type = models.ForeignKey(FeedType, on_delete=models.SET_NULL, null=True, blank=True, help_text="Recommended feed type")
    feed_cost_per_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Cost per kg of feed")
    daily_feed_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Daily feed cost")
    
    # Status
    is_applied = models.BooleanField(default=False, help_text="Whether this advice has been applied")
    applied_date = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True, help_text="Additional notes and observations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} Feeding Advice ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate derived metrics
        if self.estimated_fish_count and self.average_fish_weight_kg:
            # Calculate total biomass
            self.total_biomass_kg = self.estimated_fish_count * self.average_fish_weight_kg
            
                # Calculate recommended feed based on feeding bands
            if self.total_biomass_kg:
                # Get the appropriate feeding band based on average fish weight
                try:
                    avg_weight_g = float(self.average_fish_weight_kg) * 1000  # Convert kg to grams
                except (ValueError, TypeError):
                    avg_weight_g = 0
                
                # Find the appropriate feeding band
                feeding_band = FeedingBand.objects.filter(
                    min_weight_g__lte=avg_weight_g,
                    max_weight_g__gte=avg_weight_g
                ).first()
                
                if feeding_band:
                    # Use the feeding band's rate
                    base_rate = feeding_band.feeding_rate_percent
                    self.feeding_frequency = feeding_band.frequency_per_day
                else:
                    # Fallback to default rate if no band found
                    base_rate = Decimal('3.0')  # 3% of biomass as base rate
                    self.feeding_frequency = 2
                
                # Temperature adjustment
                if self.water_temp_c:
                    if self.water_temp_c < 15:
                        base_rate *= Decimal('0.5')  # Reduce feeding in cold water
                    elif self.water_temp_c > 30:
                        base_rate *= Decimal('0.8')  # Reduce feeding in very warm water
                
                # Season adjustment
                if self.season == 'winter':
                    base_rate *= Decimal('0.6')
                elif self.season == 'summer':
                    base_rate *= Decimal('1.2')
                
                self.feeding_rate_percent = base_rate
                try:
                    self.recommended_feed_kg = (self.total_biomass_kg * base_rate) / Decimal('100')
                except (ValueError, TypeError, ZeroDivisionError):
                    self.recommended_feed_kg = Decimal('0')
                
                # Calculate daily feed cost
                if self.feed_cost_per_kg and self.recommended_feed_kg:
                    try:
                        self.daily_feed_cost = self.recommended_feed_kg * self.feed_cost_per_kg
                    except (ValueError, TypeError):
                        self.daily_feed_cost = Decimal('0')
        
        super().save(*args, **kwargs)


class SurvivalRate(models.Model):
    """Survival rate tracking for ponds and species"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='survival_rates')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='survival_rates', null=True, blank=True)
    date = models.DateField()
    
    # Stocking data
    initial_stocked = models.PositiveIntegerField(help_text="Initial number of fish stocked")
    current_alive = models.PositiveIntegerField(help_text="Current number of alive fish")
    
    # Mortality data
    total_mortality = models.PositiveIntegerField(default=0, help_text="Total mortality count")
    total_harvested = models.PositiveIntegerField(default=0, help_text="Total harvested count")
    
    # Calculated metrics
    survival_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, help_text="Survival rate percentage")
    total_survival_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total survival weight in kg")
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['pond', 'species', 'date']
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} Survival Rate ({self.date})"
    
    def save(self, *args, **kwargs):
        # Calculate survival rate
        if self.initial_stocked > 0:
            self.survival_rate_percent = (self.current_alive / self.initial_stocked) * 100
        
        # Calculate total mortality and harvested
        self.total_mortality = self.initial_stocked - self.current_alive - self.total_harvested
        
        super().save(*args, **kwargs)


class MedicalDiagnostic(models.Model):
    """Medical diagnostic results for fish diseases"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='medical_diagnostics')
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='medical_diagnostics')
    
    # Disease information
    disease_name = models.TextField(help_text="Possible Disease")
    confidence_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Confidence percentage (0-100)"
    )
    
    # Treatment information
    recommended_treatment = models.TextField(help_text="Recommended Treatment")
    dosage_application = models.TextField(help_text="Dosage and Application")
    
    # Additional information
    selected_organs = models.JSONField(default=list, help_text="Selected organs for diagnosis")
    selected_symptoms = models.JSONField(default=list, help_text="Selected symptoms for diagnosis")
    notes = models.TextField(blank=True, help_text="Additional notes")
    
    # Status
    is_applied = models.BooleanField(default=False, help_text="Whether treatment has been applied")
    applied_at = models.DateTimeField(null=True, blank=True, help_text="When treatment was applied")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Medical Diagnostic"
        verbose_name_plural = "Medical Diagnostics"
    
    def __str__(self):
        return f"{self.pond.name} - {self.disease_name} ({self.created_at.date()})"
    
    def save(self, *args, **kwargs):
        # Set applied_at when is_applied becomes True
        if self.is_applied and not self.applied_at:
            from django.utils import timezone
            self.applied_at = timezone.now()
        super().save(*args, **kwargs)


# ===================== CUSTOMER STOCK MANAGEMENT =====================

class CustomerStock(models.Model):
    """Customer/Pond-specific inventory tracking"""
    customer_stock_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_stocks')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='stocks')
    pond = models.ForeignKey('Pond', on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks', help_text="Pond this stock belongs to (for internal customers)")
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='customer_stocks')
    
    # Stock quantities
    current_stock = models.DecimalField(max_digits=15, decimal_places=3, default=0, help_text="Current stock quantity")
    min_stock_level = models.DecimalField(max_digits=15, decimal_places=3, default=0, help_text="Minimum stock level for alerts")
    max_stock_level = models.DecimalField(max_digits=15, decimal_places=3, null=True, blank=True, help_text="Maximum stock level")
    
    # Unit tracking
    unit = models.CharField(max_length=20, help_text="Unit of measurement (kg, pcs, bags, etc.)")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Cost per unit")
    
    # Tracking
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['customer', 'item']
        unique_together = ['user', 'customer', 'item']
        verbose_name = 'Customer Stock'
        verbose_name_plural = 'Customer Stocks'
    
    def __str__(self):
        return f"{self.customer.name} - {self.item.name} ({self.current_stock} {self.unit})"
    
    def is_low_stock(self):
        """Check if stock is below minimum level"""
        return self.current_stock <= self.min_stock_level
    
    def get_stock_status(self):
        """Get stock status for display"""
        if self.current_stock <= 0:
            return 'out_of_stock'
        elif self.is_low_stock():
            return 'low_stock'
        elif self.max_stock_level and self.current_stock >= self.max_stock_level:
            return 'overstocked'
        else:
            return 'in_stock'
    
    def add_stock(self, quantity, unit_cost=None):
        """Add stock to customer inventory"""
        self.current_stock += quantity
        if unit_cost:
            self.unit_cost = unit_cost
        self.save(update_fields=['current_stock', 'unit_cost', 'last_updated'])
    
    def remove_stock(self, quantity):
        """Remove stock from customer inventory"""
        if self.current_stock >= quantity:
            self.current_stock -= quantity
            self.save(update_fields=['current_stock', 'last_updated'])
            return True
        return False


# ===================== SIGNALS =====================

@receiver(post_save, sender=StockEntry)
def update_item_fish_aggregation_on_stock_save(sender, instance, **kwargs):
    """Update fish aggregation when stock entry is saved"""
    if instance.item.category == 'fish':
        instance.item.update_fish_aggregation()

@receiver(post_delete, sender=StockEntry)
def update_item_fish_aggregation_on_stock_delete(sender, instance, **kwargs):
    """Update fish aggregation when stock entry is deleted"""
    if instance.item.category == 'fish':
        instance.item.update_fish_aggregation()