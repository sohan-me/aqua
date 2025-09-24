from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import models
from rest_framework_recursive.fields import RecursiveField
from .models import (
    # Core Master Data
    PaymentTerms, Customer, Vendor, ItemCategory,
    Account, Item, ItemPrice, StockEntry,
    
    # Accounting Models
    JournalEntry, JournalLine, Bill, BillLine, BillPayment, BillPaymentApply,
    Invoice, InvoiceLine, CustomerPayment, CustomerPaymentApply,
    Deposit, DepositLine, Check, CheckExpenseLine, CheckItemLine,
    
    # Inventory Models
    InventoryTransaction, InventoryTransactionLine, CustomerStock,
    
    # Item Sales & Issues
    ItemSales, ItemSalesLine,
    
    # Aquaculture Operations
    StockingEvent, StockingLine, FeedingEvent, FeedingLine,
    MedicineEvent, MedicineLine, OtherPondEvent, OtherPondEventLine,
    
    # Employee & Payroll
    Employee, EmployeeDocument, PayrollRun, PayrollLine,
    
    # Original Models (Updated)
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income,
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice, SurvivalRate,
    MedicalDiagnostic
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


# ===================== CORE MASTER DATA SERIALIZERS =====================

class PaymentTermsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTerms
        fields = '__all__'
        read_only_fields = ['terms_id', 'created_at']


class CustomerSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['customer_id', 'user', 'created_at', 'updated_at']


class VendorSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    terms_default_name = serializers.CharField(source='terms_default.name', read_only=True)
    
    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ['vendor_id', 'user', 'created_at', 'updated_at']


class ItemCategorySerializer(serializers.ModelSerializer):
    children = RecursiveField(many=True, read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    level = serializers.IntegerField(read_only=True)
    children_count = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ItemCategory
        fields = '__all__'
        read_only_fields = ['item_category_id', 'user', 'created_at', 'lft', 'rght', 'tree_id', 'level']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def get_items_count(self, obj):
        return obj.items.count()


class AccountSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    children = RecursiveField(many=True, read_only=True)
    level = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Account
        fields = '__all__'
        read_only_fields = ['account_id', 'user', 'created_at', 'updated_at', 'lft', 'rght', 'tree_id', 'level']


class AccountTreeSerializer(serializers.ModelSerializer):
    """Flat tree representation for Chart of Accounts"""
    children = RecursiveField(many=True, read_only=True)
    full_path = serializers.SerializerMethodField()
    
    class Meta:
        model = Account
        fields = ['account_id', 'name', 'code', 'account_type', 'parent', 'level', 'full_path', 'children']
    
    def get_full_path(self, obj):
        """Get the full path from root to this account"""
        ancestors = obj.get_ancestors(include_self=True)
        return ' > '.join([f"{ancestor.code} - {ancestor.name}" if ancestor.code else ancestor.name for ancestor in ancestors])


class StockEntrySerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    kg_equivalent = serializers.SerializerMethodField()
    
    class Meta:
        model = StockEntry
        fields = '__all__'
        read_only_fields = ['entry_id', 'user', 'total_cost', 'created_at', 'updated_at']
    
    def get_kg_equivalent(self, obj):
        return obj.get_kg_equivalent()


class ItemSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    category_name = serializers.CharField(source='get_category_display', read_only=True)
    income_account_name = serializers.CharField(source='income_account.name', read_only=True)
    expense_account_name = serializers.CharField(source='expense_account.name', read_only=True)
    asset_account_name = serializers.CharField(source='asset_account.name', read_only=True)
    cost_of_goods_sold_account_name = serializers.CharField(source='cost_of_goods_sold_account.name', read_only=True)
    stock_status = serializers.CharField(source='get_stock_status', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    total_stock_kg = serializers.SerializerMethodField()
    stock_summary = serializers.SerializerMethodField()
    stock_entries = StockEntrySerializer(many=True, read_only=True)
    
    class Meta:
        model = Item
        fields = '__all__'
        read_only_fields = ['item_id', 'user', 'created_at', 'updated_at']
    
    def get_total_stock_kg(self, obj):
        return obj.get_total_stock_kg()
    
    def get_stock_summary(self, obj):
        return obj.get_stock_summary()


class ItemPriceSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = ItemPrice
        fields = '__all__'
        read_only_fields = ['item_price_id', 'created_at']


# ===================== ACCOUNTING SERIALIZERS =====================

class JournalEntrySerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = ['je_id', 'user', 'created_at', 'updated_at']


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = JournalLine
        fields = '__all__'
        read_only_fields = ['jl_id', 'created_at']


class BillSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    terms_name = serializers.CharField(source='terms.name', read_only=True)
    
    class Meta:
        model = Bill
        fields = '__all__'
        read_only_fields = ['bill_id', 'user', 'created_at', 'updated_at']


class BillLineSerializer(serializers.ModelSerializer):
    expense_account_name = serializers.CharField(source='expense_account.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = BillLine
        fields = '__all__'
        read_only_fields = ['bill_line_id', 'created_at']


class BillPaymentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    payment_account_name = serializers.CharField(source='payment_account.name', read_only=True)
    
    class Meta:
        model = BillPayment
        fields = '__all__'
        read_only_fields = ['bill_payment_id', 'user', 'created_at', 'updated_at']


class BillPaymentApplySerializer(serializers.ModelSerializer):
    bill_vendor_name = serializers.CharField(source='bill.vendor.name', read_only=True)
    
    class Meta:
        model = BillPaymentApply
        fields = '__all__'
        read_only_fields = ['bill_payment_apply_id', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    terms_name = serializers.CharField(source='terms.name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['invoice_id', 'user', 'invoice_no', 'created_at', 'updated_at']


class InvoiceLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = InvoiceLine
        fields = '__all__'
        read_only_fields = ['invoice_line_id', 'created_at']


class CustomerPaymentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    deposit_account_name = serializers.CharField(source='deposit_account.name', read_only=True)
    
    class Meta:
        model = CustomerPayment
        fields = '__all__'
        read_only_fields = ['cust_payment_id', 'user', 'created_at', 'updated_at']


class CustomerPaymentApplySerializer(serializers.ModelSerializer):
    invoice_customer_name = serializers.CharField(source='invoice.customer.name', read_only=True)
    invoice_no = serializers.CharField(source='invoice.invoice_no', read_only=True)
    
    class Meta:
        model = CustomerPaymentApply
        fields = '__all__'
        read_only_fields = ['cust_payment_apply_id', 'created_at']


class DepositLineSerializer(serializers.ModelSerializer):
    customer_payment_customer_name = serializers.CharField(source='customer_payment.customer.name', read_only=True)
    
    class Meta:
        model = DepositLine
        fields = '__all__'
        read_only_fields = ['deposit_line_id', 'created_at']


class DepositSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    lines = DepositLineSerializer(many=True, read_only=True)
    
    class Meta:
        model = Deposit
        fields = '__all__'
        read_only_fields = ['deposit_id', 'user', 'created_at', 'updated_at']


class CheckSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    
    class Meta:
        model = Check
        fields = '__all__'
        read_only_fields = ['check_id', 'user', 'check_no', 'created_at', 'updated_at']


class CheckExpenseLineSerializer(serializers.ModelSerializer):
    expense_account_name = serializers.CharField(source='expense_account.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = CheckExpenseLine
        fields = '__all__'
        read_only_fields = ['check_expense_line_id', 'created_at']


class CheckItemLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = CheckItemLine
        fields = '__all__'
        read_only_fields = ['check_item_line_id', 'amount', 'created_at']


# ===================== INVENTORY SERIALIZERS =====================

class InventoryTransactionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    bill_vendor_name = serializers.CharField(source='bill.vendor.name', read_only=True)
    check_no = serializers.CharField(source='check.check_no', read_only=True)
    
    class Meta:
        model = InventoryTransaction
        fields = '__all__'
        read_only_fields = ['inv_txn_id', 'user', 'created_at', 'updated_at']


class InventoryTransactionLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = InventoryTransactionLine
        fields = '__all__'
        read_only_fields = ['inv_txn_line_id', 'created_at']


# ===================== ITEM SALES & ISSUES SERIALIZERS =====================

class ItemSalesSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    total_lines = serializers.SerializerMethodField()
    
    class Meta:
        model = ItemSales
        fields = '__all__'
        read_only_fields = ['sale_id', 'user', 'created_at', 'updated_at']
    
    def get_total_lines(self, obj):
        return obj.lines.count()


class ItemSalesLineSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source='item.item_id', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    sale_id = serializers.IntegerField(source='item_sale.sale_id', read_only=True)
    
    class Meta:
        model = ItemSalesLine
        fields = '__all__'
        read_only_fields = ['sale_line_id', 'created_at']


# ===================== AQUACULTURE OPERATIONS SERIALIZERS =====================

class StockingEventSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_id = serializers.IntegerField(source='pond.pond_id', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    total_fish = serializers.SerializerMethodField()
    total_weight = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = StockingEvent
        fields = '__all__'
        read_only_fields = ['stocking_id', 'user', 'created_at', 'updated_at']
    
    def get_total_fish(self, obj):
        return sum(line.qty_pcs for line in obj.lines.all())
    
    def get_total_weight(self, obj):
        return sum(float(line.weight_kg or 0) for line in obj.lines.all())
    
    def get_total_cost(self, obj):
        return sum(float(line.unit_cost or 0) * float(line.weight_kg or 0) for line in obj.lines.all())


class StockingLineSerializer(serializers.ModelSerializer):
    species_id = serializers.IntegerField(source='species.id', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    stocking_id = serializers.IntegerField(source='stocking_event.stocking_id', read_only=True)
    
    class Meta:
        model = StockingLine
        fields = '__all__'
        read_only_fields = ['stocking_line_id', 'stocking_event', 'created_at']


class FeedingEventSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    feed_item_name = serializers.CharField(source='feed_item.name', read_only=True)
    total_amount_display = serializers.SerializerMethodField()
    
    class Meta:
        model = FeedingEvent
        fields = '__all__'
        read_only_fields = ['feeding_id', 'user', 'created_at', 'updated_at']
    
    def get_total_amount_display(self, obj):
        """Get display text for total amount (packets + kg)"""
        if obj.packet_qty and obj.packet_size:
            total_kg = obj.packet_qty * obj.packet_size
            return f"{obj.packet_qty} packets ({total_kg} kg)"
        elif obj.amount_kg:
            return f"{obj.amount_kg} kg"
        return "No amount specified"


class FeedingLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = FeedingLine
        fields = '__all__'
        read_only_fields = ['feeding_line_id', 'created_at']


class MedicineEventSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = MedicineEvent
        fields = '__all__'
        read_only_fields = ['medicine_id', 'user', 'created_at', 'updated_at']
    
    def get_total_cost(self, obj):
        """Calculate total cost from medicine lines"""
        total = obj.lines.aggregate(
            total=models.Sum(models.F('qty_used') * models.F('unit_cost'))
        )['total']
        return total or 0


class MedicineLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    medicine_type_display = serializers.CharField(source='get_medicine_type_display', read_only=True)
    treatment_type_display = serializers.CharField(source='get_treatment_type_display', read_only=True)
    state_type_display = serializers.CharField(source='get_state_type_display', read_only=True)
    dosage_unit_display = serializers.CharField(source='get_dosage_unit_display', read_only=True)
    unit_of_measure_display = serializers.CharField(source='get_unit_of_measure_display', read_only=True)
    
    class Meta:
        model = MedicineLine
        fields = '__all__'
        read_only_fields = ['medicine_line_id', 'created_at']


class OtherPondEventSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = OtherPondEvent
        fields = '__all__'
        read_only_fields = ['other_event_id', 'user', 'created_at', 'updated_at']


class OtherPondEventLineSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = OtherPondEventLine
        fields = '__all__'
        read_only_fields = ['other_event_line_id', 'created_at']


# ===================== EMPLOYEE & PAYROLL SERIALIZERS =====================

class EmployeeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['employee_id', 'user', 'created_at', 'updated_at']


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    
    class Meta:
        model = EmployeeDocument
        fields = '__all__'
        read_only_fields = ['employee_document_id', 'created_at']


class PayrollRunSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = PayrollRun
        fields = '__all__'
        read_only_fields = ['payroll_run_id', 'user', 'created_at', 'updated_at']


class PayrollLineSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    payment_account_name = serializers.CharField(source='payment_account.name', read_only=True)
    check_no = serializers.CharField(source='check.check_no', read_only=True)
    
    class Meta:
        model = PayrollLine
        fields = '__all__'
        read_only_fields = ['payroll_line_id', 'net_pay', 'created_at']


class SpeciesSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children = serializers.SerializerMethodField()
    full_path = serializers.SerializerMethodField()
    
    class Meta:
        model = Species
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'lft', 'rght', 'tree_id', 'level']
    
    def get_children(self, obj):
        """Get children of the species"""
        if hasattr(obj, 'children'):
            return SpeciesSerializer(obj.children.all(), many=True).data
        return []
    
    def get_full_path(self, obj):
        """Get the full hierarchical path"""
        if hasattr(obj, 'get_full_path'):
            return obj.get_full_path()
        return obj.name


class PondSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Pond
        fields = '__all__'
        read_only_fields = ['pond_id', 'volume_m3', 'created_at', 'updated_at', 'user']


class StockingSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    
    class Meta:
        model = Stocking
        fields = '__all__'
        read_only_fields = ['stocking_id', 'initial_avg_weight_kg', 'created_at']


class DailyLogSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = DailyLog
        fields = '__all__'
        read_only_fields = ['created_at']


class FeedTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedType
        fields = '__all__'
        read_only_fields = ['created_at']


class FeedSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    feed_type_name = serializers.CharField(source='feed_type.name', read_only=True)
    
    class Meta:
        model = Feed
        fields = '__all__'
        read_only_fields = ['total_cost', 'feeding_rate_percent', 'created_at']


class SampleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleType
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at']


class SamplingSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    sample_type_name = serializers.CharField(source='sample_type.name', read_only=True)
    sample_type_icon = serializers.CharField(source='sample_type.icon', read_only=True)
    sample_type_color = serializers.CharField(source='sample_type.color', read_only=True)
    
    class Meta:
        model = Sampling
        fields = '__all__'
        read_only_fields = ['created_at']


class MortalitySerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    
    class Meta:
        model = Mortality
        fields = '__all__'
        read_only_fields = ['total_weight_kg', 'created_at']


class HarvestSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    
    class Meta:
        model = Harvest
        fields = '__all__'
        read_only_fields = ['avg_weight_kg', 'total_count', 'total_revenue', 'created_at']


class ExpenseTypeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    parent_name = serializers.CharField(source='parent.category', read_only=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpenseType
        fields = ['id', 'user', 'user_username', 'category', 'description', 'parent', 'parent_name', 'full_path', 'children', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_children(self, obj):
        """Get children expense types"""
        children = obj.get_children()
        return ExpenseTypeSerializer(children, many=True).data


class IncomeTypeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    parent_name = serializers.CharField(source='parent.category', read_only=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = IncomeType
        fields = ['id', 'user', 'user_username', 'category', 'description', 'parent', 'parent_name', 'full_path', 'children', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_children(self, obj):
        """Get children income types"""
        children = obj.get_children()
        return IncomeTypeSerializer(children, many=True).data


class ExpenseSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    expense_type_name = serializers.CharField(source='expense_type.name', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class IncomeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    income_type_name = serializers.CharField(source='income_type.category', read_only=True)
    
    class Meta:
        model = Income
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class InventoryFeedSerializer(serializers.ModelSerializer):
    feed_type_name = serializers.CharField(source='feed_type.name', read_only=True)
    
    class Meta:
        model = InventoryFeed
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class TreatmentSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = Treatment
        fields = '__all__'
        read_only_fields = ['created_at']


class AlertSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['created_at']


class SettingSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Setting
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']


class FeedingBandSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedingBand
        fields = '__all__'
        read_only_fields = ['created_at']


class EnvAdjustmentSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = EnvAdjustment
        fields = '__all__'
        read_only_fields = ['created_at']


class KPIDashboardSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = KPIDashboard
        fields = '__all__'
        read_only_fields = ['profit_loss', 'created_at']


# Nested serializers for detailed views
class PondDetailSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    stockings = StockingSerializer(many=True, read_only=True)
    daily_logs = DailyLogSerializer(many=True, read_only=True)
    feeds = FeedSerializer(many=True, read_only=True)
    samplings = SamplingSerializer(many=True, read_only=True)
    mortalities = MortalitySerializer(many=True, read_only=True)
    harvests = HarvestSerializer(many=True, read_only=True)
    expenses = ExpenseSerializer(many=True, read_only=True)
    incomes = IncomeSerializer(many=True, read_only=True)
    treatments = TreatmentSerializer(many=True, read_only=True)
    alerts = AlertSerializer(many=True, read_only=True)
    env_adjustments = EnvAdjustmentSerializer(many=True, read_only=True)
    kpis = KPIDashboardSerializer(many=True, read_only=True)
    
    class Meta:
        model = Pond
        fields = '__all__'
        read_only_fields = ['volume_m3', 'created_at', 'updated_at', 'user']


# Dashboard summary serializers
class PondSummarySerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    latest_stocking = StockingSerializer(source='stockings.first', read_only=True)
    latest_daily_log = DailyLogSerializer(source='daily_logs.first', read_only=True)
    latest_harvest = HarvestSerializer(source='harvests.first', read_only=True)
    total_expenses = serializers.SerializerMethodField()
    total_income = serializers.SerializerMethodField()
    active_alerts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Pond
        fields = [
            'pond_id', 'name', 'user_username', 'water_area_decimal', 'depth_ft', 'volume_m3', 
            'location', 'is_active', 'latest_stocking', 'latest_daily_log', 
            'latest_harvest', 'total_expenses', 'total_income', 'active_alerts_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['volume_m3', 'created_at', 'updated_at']
    
    def get_total_expenses(self, obj):
        return sum(expense.amount for expense in obj.expenses.all())
    
    def get_total_income(self, obj):
        return sum(income.amount for income in obj.incomes.all())
    
    def get_active_alerts_count(self, obj):
        return obj.alerts.filter(is_resolved=False).count()


# Financial summary serializers
class FinancialSummarySerializer(serializers.Serializer):
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_loss = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses_by_category = serializers.DictField()
    income_by_category = serializers.DictField()
    monthly_trends = serializers.DictField()


# Fish Sampling serializers
class FishSamplingSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = FishSampling
        fields = '__all__'
        read_only_fields = ['company', 'average_weight_kg', 'fish_per_kg', 'condition_factor', 'growth_rate_kg_per_day', 'biomass_difference_kg', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation to provide better error messages for unique constraint violations"""
        pond = data.get('pond')
        species = data.get('species')
        date = data.get('date')
        
        # Check for existing fish sampling with same pond, species, and date
        existing_sampling = FishSampling.objects.filter(
            pond=pond,
            species=species,
            date=date
        )
        
        # If updating, exclude the current instance
        if self.instance:
            existing_sampling = existing_sampling.exclude(id=self.instance.id)
        
        if existing_sampling.exists():
            species_name = species.name if species else "Mixed species"
            raise serializers.ValidationError({
                'non_field_errors': [f'Fish sampling for {pond.name} - {species_name} on {date} already exists. Please choose a different date or update the existing record.']
            })
        
        return data


# Feeding Advice serializers
class FeedingAdviceSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    feed_type_name = serializers.CharField(source='feed_type.name', read_only=True)
    medical_diagnostics_data = serializers.SerializerMethodField()
    
    class Meta:
        model = FeedingAdvice
        fields = '__all__'
        read_only_fields = ['company', 'total_biomass_kg', 'recommended_feed_kg', 'feeding_rate_percent', 'daily_feed_cost', 'created_at', 'updated_at']
    
    def get_medical_diagnostics_data(self, obj):
        """Get related medical diagnostics data"""
        from .models import MedicalDiagnostic
        diagnostics = obj.medical_diagnostics.all()
        return MedicalDiagnosticSerializer(diagnostics, many=True).data


# Survival Rate serializers
class SurvivalRateSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    
    class Meta:
        model = SurvivalRate
        fields = '__all__'
        read_only_fields = ['survival_rate_percent', 'total_mortality', 'total_survival_kg', 'created_at', 'updated_at']


# Medical Diagnostic serializers
class MedicalDiagnosticSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    pond_area = serializers.DecimalField(source='pond.water_area_decimal', max_digits=8, decimal_places=3, read_only=True)
    pond_location = serializers.CharField(source='pond.location', read_only=True)
    
    class Meta:
        model = MedicalDiagnostic
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at', 'applied_at']
    
    def create(self, validated_data):
        # Automatically set the user from the request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CustomerStockSerializer(serializers.ModelSerializer):
    """Serializer for customer stock management"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_type = serializers.CharField(source='item.item_type', read_only=True)
    packet_size = serializers.DecimalField(source='item.packet_size', read_only=True, max_digits=10, decimal_places=2)
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerStock
        fields = '__all__'
        read_only_fields = ['customer_stock_id', 'user', 'created_at', 'last_updated']
    
    def get_stock_status(self, obj):
        """Get stock status for display"""
        return obj.get_stock_status()
    
    def create(self, validated_data):
        # Automatically set the user from the request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)