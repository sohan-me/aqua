from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Pond(models.Model):
    """Pond management model"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ponds')
    name = models.CharField(max_length=100)
    area_decimal = models.DecimalField(max_digits=8, decimal_places=3, help_text="Area in decimal units (1 decimal = 40.46 m²)")
    depth_ft = models.DecimalField(max_digits=6, decimal_places=2, help_text="Depth in feet")
    volume_m3 = models.DecimalField(max_digits=10, decimal_places=3, help_text="Volume in cubic meters")
    location = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @property
    def area_sqm(self):
        """Convert decimal area to square meters"""
        if isinstance(self.area_decimal, (int, float)):
            area_decimal_decimal = Decimal(str(self.area_decimal))
        else:
            area_decimal_decimal = self.area_decimal
        return area_decimal_decimal * Decimal('40.46')
    
    def save(self, *args, **kwargs):
        # Auto-calculate volume: Area (decimal converted to m²) × Depth (ft converted to m)
        # Convert feet to meters: 1 foot = 0.3048 meters
        # Convert decimal to m²: 1 decimal = 40.46 m²
        if isinstance(self.depth_ft, (int, float)):
            depth_ft_decimal = Decimal(str(self.depth_ft))
        else:
            depth_ft_decimal = self.depth_ft
        
        if isinstance(self.area_decimal, (int, float)):
            area_decimal_decimal = Decimal(str(self.area_decimal))
        else:
            area_decimal_decimal = self.area_decimal
            
        depth_m = depth_ft_decimal * Decimal('0.3048')
        area_sqm = area_decimal_decimal * Decimal('40.46')
        self.volume_m3 = area_sqm * depth_m
        super().save(*args, **kwargs)


class Species(models.Model):
    """Fish species model"""
    name = models.CharField(max_length=100, unique=True)
    scientific_name = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True)
    optimal_temp_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    optimal_temp_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    optimal_ph_min = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    optimal_ph_max = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Species'
    
    def __str__(self):
        return self.name


class Stocking(models.Model):
    """Fish stocking records - based on the sheet data"""
    stocking_id = models.AutoField(primary_key=True)
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='stockings')
    species = models.ForeignKey(Species, on_delete=models.CASCADE, related_name='stockings')
    date = models.DateField()
    pcs = models.PositiveIntegerField(help_text="Number of pieces stocked")
    line_pcs_per_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Pieces per kg")
    initial_avg_g = models.DecimalField(max_digits=10, decimal_places=3, help_text="Initial average weight in grams")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['pond', 'species', 'date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.species.name} ({self.date})"
    
    @property
    def total_weight_kg(self):
        """Calculate total weight in kg"""
        return (self.pcs * self.initial_avg_g) / 1000


class DailyLog(models.Model):
    """Daily operations log"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    weather = models.CharField(max_length=100, blank=True)
    water_temp_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ph = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    dissolved_oxygen = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ammonia = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    nitrite = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
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
    cost_per_packet = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Cost per packet (25kg) of feed")
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
        # Auto-calculate total cost if cost_per_packet is provided
        if self.cost_per_packet and not self.total_cost:
            # Calculate packets used (25kg per packet)
            if isinstance(self.amount_kg, (int, float)):
                amount_kg_decimal = Decimal(str(self.amount_kg))
            else:
                amount_kg_decimal = self.amount_kg
            if isinstance(self.cost_per_packet, (int, float)):
                cost_per_packet_decimal = Decimal(str(self.cost_per_packet))
            else:
                cost_per_packet_decimal = self.cost_per_packet
            packets_used = amount_kg_decimal / Decimal('25')
            self.total_cost = packets_used * cost_per_packet_decimal
        
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
    date = models.DateField()
    count = models.PositiveIntegerField()
    avg_weight_g = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cause = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Mortalities'
    
    def __str__(self):
        return f"{self.pond.name} - {self.count} fish ({self.date})"


class Harvest(models.Model):
    """Harvest records"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='harvests')
    date = models.DateField()
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    total_count = models.PositiveIntegerField()
    avg_weight_g = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.pond.name} - {self.total_weight_kg}kg ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate revenue if price is provided
        if self.price_per_kg and not self.total_revenue:
            self.total_revenue = self.total_weight_kg * self.price_per_kg
        super().save(*args, **kwargs)


class ExpenseType(models.Model):
    """Expense type model"""
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=[
        ('feed', 'Feed'),
        ('medicine', 'Medicine'),
        ('equipment', 'Equipment'),
        ('labor', 'Labor'),
        ('utilities', 'Utilities'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ])
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class IncomeType(models.Model):
    """Income type model"""
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=[
        ('harvest', 'Harvest'),
        ('seedling', 'Seedling'),
        ('consulting', 'Consulting'),
        ('equipment_sales', 'Equipment Sales'),
        ('services', 'Services'),
        ('other', 'Other'),
    ])
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class Expense(models.Model):
    """Expense tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
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
        return f"{self.income_type.name} - ৳{self.amount} ({self.date})"


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
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fish_samplings')
    date = models.DateField()
    
    # Sampling data
    sample_size = models.PositiveIntegerField(help_text="Number of fish sampled")
    total_weight_kg = models.DecimalField(max_digits=8, decimal_places=3, help_text="Total weight of sampled fish in kg")
    average_weight_g = models.DecimalField(max_digits=8, decimal_places=2, help_text="Average weight per fish in grams")
    fish_per_kg = models.DecimalField(max_digits=8, decimal_places=2, help_text="Number of fish per kg")
    
    # Growth metrics
    growth_rate_g_per_day = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Daily growth rate in grams")
    condition_factor = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, help_text="Fish condition factor")
    
    # Notes and observations
    notes = models.TextField(blank=True, help_text="Observations and notes about the sampling")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ['pond', 'date']
    
    def __str__(self):
        return f"{self.pond.name} - Sampling ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate derived metrics
        if self.total_weight_kg and self.sample_size:
            # Calculate average weight in grams
            self.average_weight_g = (self.total_weight_kg * 1000) / self.sample_size
            
            # Calculate fish per kg
            self.fish_per_kg = self.sample_size / self.total_weight_kg
            
            # Calculate condition factor (K = 100 * W / L^3, simplified for weight-based)
            # This is a simplified version - in practice you'd need length measurements
            if self.average_weight_g:
                # Using a simplified condition factor based on weight
                self.condition_factor = self.average_weight_g / 100  # Simplified calculation
        
        super().save(*args, **kwargs)


class FeedingAdvice(models.Model):
    """AI-powered feeding advice based on fish growth and conditions"""
    pond = models.ForeignKey(Pond, on_delete=models.CASCADE, related_name='feeding_advice')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feeding_advice')
    date = models.DateField()
    
    # Fish data
    estimated_fish_count = models.PositiveIntegerField(help_text="Estimated number of fish in pond")
    average_fish_weight_g = models.DecimalField(max_digits=8, decimal_places=2, help_text="Average fish weight in grams")
    total_biomass_kg = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total fish biomass in kg")
    
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
        return f"{self.pond.name} - Feeding Advice ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate derived metrics
        if self.estimated_fish_count and self.average_fish_weight_g:
            # Calculate total biomass
            self.total_biomass_kg = (self.estimated_fish_count * self.average_fish_weight_g) / 1000
            
            # Calculate recommended feed based on biomass (typically 2-5% of biomass)
            if self.total_biomass_kg:
                # Adjust feeding rate based on season and temperature
                base_rate = Decimal('3.0')  # 3% of biomass as base rate
                
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
                self.recommended_feed_kg = (self.total_biomass_kg * base_rate) / 100
                
                # Calculate daily feed cost
                if self.feed_cost_per_kg:
                    self.daily_feed_cost = self.recommended_feed_kg * self.feed_cost_per_kg
        
        super().save(*args, **kwargs)