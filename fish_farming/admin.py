from django.contrib import admin
from .models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income, 
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice, SurvivalRate
)


@admin.register(Pond)
class PondAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'water_area_decimal', 'depth_ft', 'volume_m3', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'user']
    search_fields = ['customer__name', 'location', 'user__username']
    readonly_fields = ['volume_m3', 'created_at', 'updated_at']


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ['name', 'scientific_name', 'optimal_temp_min', 'optimal_temp_max', 'created_at']
    search_fields = ['name', 'scientific_name']
    readonly_fields = ['created_at']


@admin.register(Stocking)
class StockingAdmin(admin.ModelAdmin):
    list_display = ['stocking_id', 'pond', 'species', 'date', 'pcs', 'initial_avg_weight_kg', 'total_weight_kg']
    list_filter = ['date', 'species', 'pond__user']
    search_fields = ['pond__name', 'species__name', 'notes']
    readonly_fields = ['stocking_id', 'total_weight_kg', 'initial_avg_weight_kg', 'created_at']


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    list_display = ['pond', 'date', 'weather', 'water_temp_c', 'ph', 'dissolved_oxygen']
    list_filter = ['date', 'pond__user']
    search_fields = ['pond__name', 'weather', 'notes']
    readonly_fields = ['created_at']


@admin.register(FeedType)
class FeedTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'protein_content', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(Feed)
class FeedAdmin(admin.ModelAdmin):
    list_display = ['pond', 'feed_type', 'date', 'amount_kg', 'feeding_time']
    list_filter = ['date', 'feed_type', 'pond__user']
    search_fields = ['pond__name', 'feed_type__name', 'notes']
    readonly_fields = ['created_at']


@admin.register(SampleType)
class SampleTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'icon', 'color', 'is_active', 'created_at']
    list_filter = ['is_active', 'color', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(Sampling)
class SamplingAdmin(admin.ModelAdmin):
    list_display = ['pond', 'date', 'sample_type', 'ph', 'temperature_c', 'dissolved_oxygen']
    list_filter = ['date', 'sample_type', 'pond__user']
    search_fields = ['pond__name', 'sample_type', 'notes']
    readonly_fields = ['created_at']


@admin.register(Mortality)
class MortalityAdmin(admin.ModelAdmin):
    list_display = ['pond', 'species', 'date', 'count', 'avg_weight_kg', 'total_weight_kg', 'cause']
    list_filter = ['date', 'species', 'pond__user']
    search_fields = ['pond__name', 'species__name', 'cause', 'notes']
    readonly_fields = ['total_weight_kg', 'created_at']


@admin.register(Harvest)
class HarvestAdmin(admin.ModelAdmin):
    list_display = ['pond', 'species', 'date', 'total_weight_kg', 'pieces_per_kg', 'avg_weight_kg', 'total_count', 'price_per_kg', 'total_revenue']
    list_filter = ['date', 'species', 'pond__user']
    search_fields = ['pond__name', 'species__name', 'notes']
    readonly_fields = ['avg_weight_kg', 'total_count', 'total_revenue', 'created_at']


@admin.register(ExpenseType)
class ExpenseTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(IncomeType)
class IncomeTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_type', 'user', 'pond', 'species', 'date', 'amount', 'supplier']
    list_filter = ['date', 'expense_type__category', 'user', 'species']
    search_fields = ['expense_type__name', 'user__username', 'pond__name', 'species__name', 'supplier', 'notes']
    readonly_fields = ['created_at']


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ['income_type', 'user', 'pond', 'species', 'date', 'amount', 'customer']
    list_filter = ['date', 'income_type__category', 'user', 'species']
    search_fields = ['income_type__name', 'user__username', 'pond__name', 'species__name', 'customer', 'notes']
    readonly_fields = ['created_at']


@admin.register(InventoryFeed)
class InventoryFeedAdmin(admin.ModelAdmin):
    list_display = ['feed_type', 'quantity_kg', 'unit_price', 'expiry_date', 'supplier']
    list_filter = ['expiry_date', 'supplier']
    search_fields = ['feed_type__name', 'supplier', 'batch_number', 'notes']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Treatment)
class TreatmentAdmin(admin.ModelAdmin):
    list_display = ['pond', 'date', 'treatment_type', 'product_name', 'dosage', 'unit']
    list_filter = ['date', 'treatment_type', 'pond__user']
    search_fields = ['pond__name', 'treatment_type', 'product_name', 'reason', 'notes']
    readonly_fields = ['created_at']


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['pond', 'alert_type', 'severity', 'is_resolved', 'created_at']
    list_filter = ['severity', 'is_resolved', 'created_at', 'pond__user']
    search_fields = ['pond__name', 'alert_type', 'message']
    readonly_fields = ['created_at']


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    list_display = ['user', 'key', 'value', 'updated_at']
    list_filter = ['user', 'updated_at']
    search_fields = ['user__username', 'key', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FeedingBand)
class FeedingBandAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_weight_g', 'max_weight_g', 'feeding_rate_percent', 'frequency_per_day']
    search_fields = ['name', 'notes']
    readonly_fields = ['created_at']


@admin.register(EnvAdjustment)
class EnvAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['pond', 'date', 'adjustment_type', 'amount', 'unit']
    list_filter = ['date', 'adjustment_type', 'pond__user']
    search_fields = ['pond__name', 'adjustment_type', 'reason', 'notes']
    readonly_fields = ['created_at']


@admin.register(KPIDashboard)
class KPIDashboardAdmin(admin.ModelAdmin):
    list_display = ['pond', 'date', 'avg_weight_g', 'total_biomass_kg', 'survival_rate_percent', 'profit_loss']
    list_filter = ['date', 'pond__user']
    search_fields = ['pond__name', 'notes']
    readonly_fields = ['profit_loss', 'created_at']


@admin.register(FishSampling)
class FishSamplingAdmin(admin.ModelAdmin):
    list_display = ['pond', 'species', 'date', 'sample_size', 'total_weight_kg', 'average_weight_kg', 'fish_per_kg', 'biomass_difference_kg', 'created_at']
    list_filter = ['date', 'species', 'pond__user', 'created_at']
    search_fields = ['pond__name', 'species__name', 'notes']
    readonly_fields = ['average_weight_kg', 'fish_per_kg', 'condition_factor', 'growth_rate_kg_per_day', 'biomass_difference_kg', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('pond', 'species', 'user', 'date')
        }),
        ('Sampling Data', {
            'fields': ('sample_size', 'total_weight_kg')
        }),
        ('Calculated Metrics', {
            'fields': ('average_weight_kg', 'fish_per_kg', 'growth_rate_kg_per_day', 'biomass_difference_kg', 'condition_factor'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FeedingAdvice)
class FeedingAdviceAdmin(admin.ModelAdmin):
    list_display = ['pond', 'species', 'date', 'estimated_fish_count', 'total_biomass_kg', 'recommended_feed_kg', 'feeding_rate_percent', 'is_applied']
    list_filter = ['date', 'species', 'pond__user', 'season', 'is_applied', 'created_at']
    search_fields = ['pond__name', 'species__name', 'notes']
    readonly_fields = ['total_biomass_kg', 'recommended_feed_kg', 'feeding_rate_percent', 'daily_feed_cost', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('pond', 'species', 'user', 'date')
        }),
        ('Fish Data', {
            'fields': ('estimated_fish_count', 'average_fish_weight_kg')
        }),
        ('Environmental Factors', {
            'fields': ('water_temp_c', 'season')
        }),
        ('Feed Information', {
            'fields': ('feed_type', 'feed_cost_per_kg')
        }),
        ('Calculated Recommendations', {
            'fields': ('total_biomass_kg', 'recommended_feed_kg', 'feeding_rate_percent', 'feeding_frequency', 'daily_feed_cost'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_applied', 'applied_date')
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SurvivalRate)
class SurvivalRateAdmin(admin.ModelAdmin):
    list_display = ['pond', 'species', 'date', 'initial_stocked', 'current_alive', 'survival_rate_percent', 'total_mortality', 'total_harvested']
    list_filter = ['date', 'species', 'pond__user']
    search_fields = ['pond__name', 'species__name', 'notes']
    readonly_fields = ['survival_rate_percent', 'total_mortality', 'total_survival_kg', 'created_at', 'updated_at']