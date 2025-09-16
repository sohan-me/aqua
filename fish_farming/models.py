from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Sum
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
        # Auto-calculate pieces_per_kg if pcs and total_weight_kg are provided and pieces_per_kg is not already set
        if self.pcs and self.total_weight_kg and self.total_weight_kg > 0 and not self.pieces_per_kg:
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
        unique_together = ['pond', 'species', 'date']
    
    def __str__(self):
        species_name = self.species.name if self.species else "Mixed"
        return f"{self.pond.name} - {species_name} Sampling ({self.date})"
    
    def save(self, *args, **kwargs):
        # Auto-calculate derived metrics
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