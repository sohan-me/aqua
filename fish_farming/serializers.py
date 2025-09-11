from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income,
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class SpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Species
        fields = '__all__'


class PondSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Pond
        fields = '__all__'
        read_only_fields = ['user', 'volume_m3', 'created_at', 'updated_at']


class StockingSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    species_name = serializers.CharField(source='species.name', read_only=True)
    total_weight_kg = serializers.ReadOnlyField()
    
    class Meta:
        model = Stocking
        fields = '__all__'
        read_only_fields = ['stocking_id', 'total_weight_kg', 'created_at']


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
        read_only_fields = ['created_at']


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
    
    class Meta:
        model = Mortality
        fields = '__all__'
        read_only_fields = ['created_at']


class HarvestSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    
    class Meta:
        model = Harvest
        fields = '__all__'
        read_only_fields = ['total_revenue', 'created_at']


class ExpenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseType
        fields = '__all__'
        read_only_fields = ['created_at']


class IncomeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeType
        fields = '__all__'
        read_only_fields = ['created_at']


class ExpenseSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    expense_type_name = serializers.CharField(source='expense_type.name', read_only=True)
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class IncomeSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    income_type_name = serializers.CharField(source='income_type.name', read_only=True)
    
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
        read_only_fields = ['volume_m3', 'created_at', 'updated_at']


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
            'id', 'name', 'user_username', 'area_decimal', 'depth_ft', 'volume_m3', 
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
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = FishSampling
        fields = '__all__'
        read_only_fields = ['user', 'average_weight_g', 'fish_per_kg', 'condition_factor', 'created_at', 'updated_at']


# Feeding Advice serializers
class FeedingAdviceSerializer(serializers.ModelSerializer):
    pond_name = serializers.CharField(source='pond.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    feed_type_name = serializers.CharField(source='feed_type.name', read_only=True)
    
    class Meta:
        model = FeedingAdvice
        fields = '__all__'
        read_only_fields = ['user', 'total_biomass_kg', 'recommended_feed_kg', 'feeding_rate_percent', 'daily_feed_cost', 'created_at', 'updated_at']
