from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income,
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice, SurvivalRate,
    MedicalDiagnostic, PaymentTerms, Customer, Vendor, ItemCategory,
    Account, Item, ItemPrice, StockEntry, JournalEntry, JournalLine, Bill, BillLine, BillPayment,
    BillPaymentApply, Invoice, InvoiceLine, CustomerPayment, CustomerPaymentApply,
    Deposit, DepositLine, Check, CheckExpenseLine, CheckItemLine,
    InventoryTransaction, InventoryTransactionLine, ItemSales, ItemSalesLine,
    StockingEvent, StockingLine, FeedingEvent, FeedingLine, MedicineEvent, MedicineLine, 
    OtherPondEvent, OtherPondEventLine, Employee, EmployeeDocument, PayrollRun, PayrollLine,
    CustomerStock
)
from .serializers import (
    PondSerializer, PondDetailSerializer, PondSummarySerializer,
    SpeciesSerializer, StockingSerializer, DailyLogSerializer,
    FeedTypeSerializer, FeedSerializer, SampleTypeSerializer, SamplingSerializer,
    MortalitySerializer, HarvestSerializer, ExpenseTypeSerializer,
    IncomeTypeSerializer, ExpenseSerializer, IncomeSerializer,
    InventoryFeedSerializer, TreatmentSerializer, AlertSerializer,
    SettingSerializer, FeedingBandSerializer, EnvAdjustmentSerializer,
    KPIDashboardSerializer, FinancialSummarySerializer,
    FishSamplingSerializer, FeedingAdviceSerializer, SurvivalRateSerializer,
    MedicalDiagnosticSerializer, PaymentTermsSerializer, CustomerSerializer,
    AccountSerializer, VendorSerializer, ItemCategorySerializer,
    ItemSerializer, ItemPriceSerializer, StockEntrySerializer, JournalEntrySerializer, JournalLineSerializer,
    BillSerializer, BillLineSerializer, BillPaymentSerializer, BillPaymentApplySerializer,
    InvoiceSerializer, InvoiceLineSerializer, CustomerPaymentSerializer,
    CustomerPaymentApplySerializer, DepositSerializer, DepositLineSerializer,
    CheckSerializer, CheckExpenseLineSerializer, CheckItemLineSerializer,
    InventoryTransactionSerializer, InventoryTransactionLineSerializer,
    ItemSalesSerializer, ItemSalesLineSerializer, StockingEventSerializer, 
    StockingLineSerializer, FeedingEventSerializer, FeedingLineSerializer, 
    MedicineEventSerializer, MedicineLineSerializer, OtherPondEventSerializer,
    OtherPondEventLineSerializer, EmployeeSerializer, EmployeeDocumentSerializer,
    PayrollRunSerializer, PayrollLineSerializer, CustomerStockSerializer
)


class PondViewSet(viewsets.ModelViewSet):
    """ViewSet for pond management"""
    queryset = Pond.objects.all()
    serializer_class = PondSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        ponds = Pond.objects.filter(user=self.request.user)
        
        # If no ponds exist, create demo pond
        if ponds.count() == 0:
            from fish_farming.models import Customer
            # Create demo customer if doesn't exist
            customer, created = Customer.objects.get_or_create(
                user=self.request.user,
                name="Demo Farm",
                defaults={
                    'type': 'internal_pond',
                    'email': 'demo@example.com'
                }
            )
            
            # Create demo pond
            pond = Pond.objects.create(
                user=self.request.user,
                name="Demo Pond 1",
                water_area_decimal=1.0,
                depth_ft=5.0,
                location="Demo Location"
            )
            
            # Link the customer to the pond
            customer.pond = pond
            customer.save()
            print(f"Created demo pond: {pond.name}")
            ponds = Pond.objects.filter(user=self.request.user)
        
        return ponds
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PondDetailSerializer
        elif self.action == 'summary':
            return PondSummarySerializer
        return PondSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get comprehensive summary of a pond"""
        pond = self.get_object()
        serializer = self.get_serializer(pond)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def financial_summary(self, request, pk=None):
        """Get financial summary for a pond"""
        pond = self.get_object()
        
        # Calculate totals
        total_expenses = pond.expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_income = pond.incomes.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        profit_loss = total_income - total_expenses
        
        # Expenses by category
        expenses_by_category = {}
        for expense in pond.expenses.all():
            category = expense.expense_type.category
            if category not in expenses_by_category:
                expenses_by_category[category] = Decimal('0')
            expenses_by_category[category] += expense.amount
        
        # Income by category
        income_by_category = {}
        for income in pond.incomes.all():
            category = income.income_type.category
            if category not in income_by_category:
                income_by_category[category] = Decimal('0')
            income_by_category[category] += income.amount
        
        # Monthly trends (last 12 months)
        monthly_trends = {}
        for i in range(12):
            month_start = timezone.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            
            month_expenses = pond.expenses.filter(
                date__gte=month_start, date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            month_income = pond.incomes.filter(
                date__gte=month_start, date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            monthly_trends[month_start.strftime('%Y-%m')] = {
                'expenses': float(month_expenses),
                'income': float(month_income),
                'profit_loss': float(month_income - month_expenses)
            }
        
        data = {
            'total_expenses': total_expenses,
            'total_income': total_income,
            'profit_loss': profit_loss,
            'expenses_by_category': {k: float(v) for k, v in expenses_by_category.items()},
            'income_by_category': {k: float(v) for k, v in income_by_category.items()},
            'monthly_trends': monthly_trends
        }
        
        serializer = FinancialSummarySerializer(data)
        return Response(serializer.data)


class SpeciesViewSet(viewsets.ModelViewSet):
    """ViewSet for fish species with hierarchical structure"""
    queryset = Species.objects.none()  # Will be overridden by get_queryset
    serializer_class = SpeciesSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Species.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Override list to return tree structure"""
        if request.query_params.get('tree', '').lower() == 'true':
            # Return tree structure (root nodes with children)
            queryset = self.get_queryset().filter(parent=None)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            # Return flat list
            return super().list(request, *args, **kwargs)


class StockingViewSet(viewsets.ModelViewSet):
    """ViewSet for fish stocking records"""
    queryset = Stocking.objects.all()
    serializer_class = StockingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Stocking.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        return queryset
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class DailyLogViewSet(viewsets.ModelViewSet):
    """ViewSet for daily logs"""
    queryset = DailyLog.objects.all()
    serializer_class = DailyLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DailyLog.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class FeedTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for feed types"""
    queryset = FeedType.objects.all()
    serializer_class = FeedTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class FeedViewSet(viewsets.ModelViewSet):
    """ViewSet for feed records"""
    queryset = Feed.objects.all()
    serializer_class = FeedSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Feed.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class SampleTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for sample types"""
    queryset = SampleType.objects.filter(is_active=True)
    serializer_class = SampleTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SampleType.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SamplingViewSet(viewsets.ModelViewSet):
    """ViewSet for sampling records"""
    queryset = Sampling.objects.all()
    serializer_class = SamplingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Sampling.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class MortalityViewSet(viewsets.ModelViewSet):
    """ViewSet for mortality records"""
    queryset = Mortality.objects.all()
    serializer_class = MortalitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Mortality.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        return queryset
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class HarvestViewSet(viewsets.ModelViewSet):
    """ViewSet for harvest records"""
    queryset = Harvest.objects.all()
    serializer_class = HarvestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Harvest.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        return queryset
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for expense types"""
    queryset = ExpenseType.objects.all()
    serializer_class = ExpenseTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ExpenseType.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get expense types in tree structure"""
        root_types = ExpenseType.objects.filter(user=request.user, parent=None)
        serializer = ExpenseTypeSerializer(root_types, many=True)
        return Response(serializer.data)


class IncomeTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for income types"""
    queryset = IncomeType.objects.all()
    serializer_class = IncomeTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return IncomeType.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get income types in tree structure"""
        root_types = IncomeType.objects.filter(user=request.user, parent=None)
        serializer = IncomeTypeSerializer(root_types, many=True)
        return Response(serializer.data)


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet for expense records"""
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class IncomeViewSet(viewsets.ModelViewSet):
    """ViewSet for income records"""
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Income.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InventoryFeedViewSet(viewsets.ModelViewSet):
    """ViewSet for feed inventory"""
    queryset = InventoryFeed.objects.all()
    serializer_class = InventoryFeedSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class TreatmentViewSet(viewsets.ModelViewSet):
    """ViewSet for treatment records"""
    queryset = Treatment.objects.all()
    serializer_class = TreatmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Treatment.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class AlertViewSet(viewsets.ModelViewSet):
    """ViewSet for alerts"""
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        print(f"DEBUG AlertViewSet: User {self.request.user.username} requesting alerts")
        alerts = Alert.objects.filter(pond__user=self.request.user)
        print(f"DEBUG AlertViewSet: Found {alerts.count()} alerts")
        
        # If no alerts exist, check if user has ponds and create demo alert
        if alerts.count() == 0:
            from fish_farming.models import Pond
            ponds = Pond.objects.filter(user=self.request.user)
            if ponds.exists():
                pond = ponds.first()
                print(f"No alerts found, creating demo alert for pond {pond.name}")
                Alert.objects.create(
                    pond=pond,
                    alert_type="water_quality",
                    message="Demo water quality alert - pH level is high",
                    severity="medium"
                )
                alerts = Alert.objects.filter(pond__user=self.request.user)
                print(f"Created demo alert, now have {alerts.count()} alerts")
        
        return alerts
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark an alert as resolved"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save()
        return Response({'status': 'Alert resolved'})


class SettingViewSet(viewsets.ModelViewSet):
    """ViewSet for user settings"""
    queryset = Setting.objects.all()
    serializer_class = SettingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Setting.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FeedingBandViewSet(viewsets.ModelViewSet):
    """ViewSet for feeding bands"""
    queryset = FeedingBand.objects.all()
    serializer_class = FeedingBandSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class EnvAdjustmentViewSet(viewsets.ModelViewSet):
    """ViewSet for environmental adjustments"""
    queryset = EnvAdjustment.objects.all()
    serializer_class = EnvAdjustmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return EnvAdjustment.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class KPIDashboardViewSet(viewsets.ModelViewSet):
    """ViewSet for KPI dashboard"""
    queryset = KPIDashboard.objects.all()
    serializer_class = KPIDashboardSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return KPIDashboard.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)


class FishSamplingViewSet(viewsets.ModelViewSet):
    """ViewSet for fish sampling"""
    queryset = FishSampling.objects.all()
    serializer_class = FishSamplingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = FishSampling.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond, user=self.request.user)
    
    def perform_update(self, serializer):
        """Override update to recalculate growth rates for affected records"""
        instance = serializer.save()
        
        # Recalculate growth rates for all records in the same pond
        # that come after this one chronologically
        later_samplings = FishSampling.objects.filter(
            pond=instance.pond,
            date__gte=instance.date
        ).exclude(id=instance.id).order_by('date')
        
        for sampling in later_samplings:
            sampling.calculate_growth_rate()
            sampling.save()
    
    @action(detail=False, methods=['post'])
    def recalculate_growth_rates(self, request):
        """Recalculate growth rates for all fish sampling records"""
        try:
            # Get all fish sampling records for the user
            samplings = FishSampling.objects.filter(pond__user=request.user).order_by('pond', 'date')
            
            updated_count = 0
            
            for sampling in samplings:
                old_growth_rate = sampling.growth_rate_kg_per_day
                
                # Recalculate growth rate
                sampling.calculate_growth_rate()
                
                # Save if growth rate changed
                if old_growth_rate != sampling.growth_rate_kg_per_day:
                    sampling.save()
                    updated_count += 1
            
            return Response({
                'message': f'Successfully recalculated growth rates for {updated_count} fish sampling records',
                'updated_count': updated_count,
                'total_records': samplings.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to recalculate growth rates: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def biomass_analysis(self, request):
        """Calculate biomass analysis with filtering options"""
        try:
            # Get filter parameters
            pond_id = request.query_params.get('pond')
            species_id = request.query_params.get('species')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build base queryset
            queryset = FishSampling.objects.filter(pond__user=request.user)
            
            # Apply filters
            if pond_id:
                queryset = queryset.filter(pond_id=pond_id)
            if species_id:
                queryset = queryset.filter(species_id=species_id)
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Order by date for proper analysis
            samplings = queryset.order_by('pond', 'species', 'date')
            
            # Calculate biomass metrics
            total_biomass_gain = 0
            total_biomass_loss = 0
            biomass_changes = []
            
            for sampling in samplings:
                if sampling.biomass_difference_kg:
                    if sampling.biomass_difference_kg > 0:
                        total_biomass_gain += float(sampling.biomass_difference_kg)
                    else:
                        total_biomass_loss += abs(float(sampling.biomass_difference_kg))
                    
                    biomass_changes.append({
                        'id': sampling.id,
                        'pond_name': sampling.pond.name,
                        'species_name': sampling.species.name if sampling.species else 'Mixed',
                        'date': sampling.date,
                        'biomass_difference_kg': float(sampling.biomass_difference_kg),
                        'growth_rate_kg_per_day': float(sampling.growth_rate_kg_per_day) if sampling.growth_rate_kg_per_day else None,
                        'average_weight_kg': float(sampling.average_weight_kg),
                        'sample_size': sampling.sample_size
                    })
            
            # Calculate net biomass change
            net_biomass_change = total_biomass_gain - total_biomass_loss
            
            # Group by pond and species for summary
            pond_summary = {}
            species_summary = {}
            
            for sampling in samplings:
                pond_name = sampling.pond.name
                species_name = sampling.species.name if sampling.species else 'Mixed'
                
                # Pond summary
                if pond_name not in pond_summary:
                    pond_summary[pond_name] = {
                        'total_gain': 0,
                        'total_loss': 0,
                        'net_change': 0,
                        'sampling_count': 0
                    }
                
                if sampling.biomass_difference_kg:
                    if sampling.biomass_difference_kg > 0:
                        pond_summary[pond_name]['total_gain'] += float(sampling.biomass_difference_kg)
                    else:
                        pond_summary[pond_name]['total_loss'] += abs(float(sampling.biomass_difference_kg))
                
                pond_summary[pond_name]['sampling_count'] += 1
                pond_summary[pond_name]['net_change'] = pond_summary[pond_name]['total_gain'] - pond_summary[pond_name]['total_loss']
                
                # Species summary
                if species_name not in species_summary:
                    species_summary[species_name] = {
                        'total_gain': 0,
                        'total_loss': 0,
                        'net_change': 0,
                        'sampling_count': 0
                    }
                
                if sampling.biomass_difference_kg:
                    if sampling.biomass_difference_kg > 0:
                        species_summary[species_name]['total_gain'] += float(sampling.biomass_difference_kg)
                    else:
                        species_summary[species_name]['total_loss'] += abs(float(sampling.biomass_difference_kg))
                
                species_summary[species_name]['sampling_count'] += 1
                species_summary[species_name]['net_change'] = species_summary[species_name]['total_gain'] - species_summary[species_name]['total_loss']
            
            # Calculate total current biomass for each pond/species combination
            total_current_biomass = 0
            pond_species_biomass = {}
            total_area_sqm = 0
            pond_load_analysis = {}
            
            # Get all unique pond/species combinations from STOCKING data (not just samplings)
            # This ensures we include all stocked fish, even if they don't have sampling data yet
            stocking_combinations = Stocking.objects.filter(pond__user=request.user).values('pond', 'species').distinct()
            
            # Apply filters to stocking combinations
            if pond_id:
                stocking_combinations = stocking_combinations.filter(pond_id=pond_id)
            if species_id:
                stocking_combinations = stocking_combinations.filter(species_id=species_id)
            
            for combo in stocking_combinations:
                pond_id = combo['pond']
                species_id = combo['species']
                
                # Get pond and species objects
                pond = Pond.objects.get(id=pond_id)
                species = Species.objects.get(id=species_id) if species_id else None
                
                # Get latest stocking for this pond/species
                if species:
                    latest_stocking = Stocking.objects.filter(
                        pond=pond, species=species
                    ).order_by('-date').first()
                else:
                    latest_stocking = Stocking.objects.filter(
                        pond=pond
                    ).order_by('-date').first()
                
                if latest_stocking:
                    # Calculate cumulative biomass change from ALL samplings (not just filtered ones)
                    cumulative_biomass_change = 0
                    combo_samplings = FishSampling.objects.filter(
                        pond=pond, species=species
                    ).order_by('date')
                    
                    for sampling in combo_samplings:
                        if sampling.biomass_difference_kg:
                            cumulative_biomass_change += float(sampling.biomass_difference_kg)
                    
                    # Current biomass = Initial stocking + Cumulative growth
                    initial_biomass = float(latest_stocking.total_weight_kg)
                    current_biomass = initial_biomass + cumulative_biomass_change
                    
                    total_current_biomass += current_biomass
                    
                    # Calculate pond area (only count once per pond)
                    pond_area_sqm = float(pond.area_sqm)
                    if pond.id not in pond_load_analysis:
                        total_area_sqm += pond_area_sqm
                        pond_load_analysis[pond.id] = {
                            'pond_name': pond.name,
                            'area_sqm': pond_area_sqm,
                            'area_decimal': float(pond.water_area_decimal),
                            'total_biomass_kg': 0,
                            'load_kg_per_sqm': 0
                        }
                    
                    # Add biomass to pond total
                    pond_load_analysis[pond.id]['total_biomass_kg'] += current_biomass
                    
                    # Store for detailed breakdown
                    key = f"{pond.name} - {species.name if species else 'Mixed'}"
                    pond_species_biomass[key] = {
                        'initial_biomass': initial_biomass,
                        'growth_biomass': cumulative_biomass_change,
                        'current_biomass': current_biomass
                    }
            
            # Calculate load for each pond (kg/m²)
            for pond_id, pond_data in pond_load_analysis.items():
                if pond_data['area_sqm'] > 0:
                    pond_data['load_kg_per_sqm'] = pond_data['total_biomass_kg'] / pond_data['area_sqm']
                else:
                    pond_data['load_kg_per_sqm'] = 0
            
            # Calculate overall load analysis
            overall_load_kg_per_sqm = total_current_biomass / total_area_sqm if total_area_sqm > 0 else 0
            
            return Response({
                'summary': {
                    'total_biomass_gain_kg': total_biomass_gain,
                    'total_biomass_loss_kg': total_biomass_loss,
                    'net_biomass_change_kg': net_biomass_change,
                    'total_current_biomass_kg': total_current_biomass,
                    'total_samplings': samplings.count(),
                    'samplings_with_biomass_data': len(biomass_changes)
                },
                'load_analysis': {
                    'total_area_sqm': total_area_sqm,
                    'overall_load_kg_per_sqm': overall_load_kg_per_sqm,
                    'pond_loads': list(pond_load_analysis.values())
                },
                'pond_summary': pond_summary,
                'species_summary': species_summary,
                'biomass_changes': biomass_changes,
                'pond_species_biomass': pond_species_biomass,
                'filters_applied': {
                    'pond_id': pond_id,
                    'species_id': species_id,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to calculate biomass analysis: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def fcr_analysis(self, request):
        """Get FCR (Feed Conversion Ratio) analysis for ponds and species"""
        from django.db.models import Sum, Avg, Count, Q
        from datetime import timedelta, datetime
        
        try:
            # Get query parameters
            pond_id = request.GET.get('pond')
            species_id = request.GET.get('species')
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')
            
            # Default to last 90 days if no dates provided
            if not start_date:
                start_date = (timezone.now().date() - timedelta(days=90)).isoformat()
            if not end_date:
                end_date = timezone.now().date().isoformat()
            
            # Convert string dates to date objects for proper filtering
            from datetime import datetime
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Base querysets
            feeds = Feed.objects.filter(
                pond__user=request.user,
                date__gte=start_date_obj,
                date__lte=end_date_obj
            )
            
            samplings = FishSampling.objects.filter(
                pond__user=request.user,
                date__gte=start_date_obj,
                date__lte=end_date_obj
            )
            
            # Apply filters
            if pond_id:
                feeds = feeds.filter(pond_id=pond_id)
                samplings = samplings.filter(pond_id=pond_id)
            if species_id:
                samplings = samplings.filter(species_id=species_id)
            
            # Get all pond/species combinations - use set to ensure uniqueness
            combinations_raw = samplings.values('pond', 'species')
            combinations_set = set()
            for combo in combinations_raw:
                combinations_set.add((combo['pond'], combo['species']))
            combinations = [{'pond': p, 'species': s} for p, s in combinations_set]
            
            fcr_data = []
            total_feed = 0
            total_weight_gain = 0
            
            for combo in combinations:
                pond_id = combo['pond']
                species_id = combo['species']
                
                # Get pond and species names
                try:
                    pond = Pond.objects.get(id=pond_id, user=request.user)
                    species = Species.objects.get(id=species_id)
                except (Pond.DoesNotExist, Species.DoesNotExist):
                    continue
                
                # Calculate total feed for this combination
                combo_feeds = feeds.filter(pond_id=pond_id)
                total_feed_kg = float(combo_feeds.aggregate(total=Sum('amount_kg'))['total'] or 0)
                
                # Calculate weight gain from samplings
                combo_samplings = samplings.filter(pond_id=pond_id, species_id=species_id).order_by('date')
                
                if combo_samplings.count() < 2:
                    continue
                
                # Get earliest (initial) and latest (final) sampling chronologically
                earliest_sampling = combo_samplings.first()  # First chronologically (oldest date)
                latest_sampling = combo_samplings.last()     # Last chronologically (newest date)
                
                # Calculate weight gain (final - initial)
                initial_weight = float(earliest_sampling.average_weight_kg)
                final_weight = float(latest_sampling.average_weight_kg)
                
                # Data quality check: if final weight is significantly smaller than initial weight,
                # try to use harvest data to get a more realistic final weight
                if final_weight < initial_weight * 0.5:
                    # Look for harvest data around the same time period to get realistic final weight
                    harvest = Harvest.objects.filter(
                        pond_id=pond_id, species_id=species_id, pond__user=request.user,
                        date__gte=latest_sampling.date - timedelta(days=7),
                        date__lte=latest_sampling.date + timedelta(days=7)
                    ).first()
                    
                    if harvest and harvest.avg_weight_kg:
                        final_weight = float(harvest.avg_weight_kg)
                        # Update the latest sampling date to match harvest date for consistency
                        latest_sampling_date = harvest.date
                    else:
                        # If no harvest data, skip this combination as data quality is poor
                        continue
                else:
                    latest_sampling_date = latest_sampling.date
                
                weight_gain_per_fish = round(final_weight - initial_weight, 4)
                
                # Estimate fish count from stocking data (most reliable source)
                estimated_fish_count = 0
                stocking = Stocking.objects.filter(
                    pond_id=pond_id, species_id=species_id, pond__user=request.user
                ).first()
                
                if stocking:
                    # Start with stocked fish count
                    estimated_fish_count = float(stocking.pcs)
                    
                    # Adjust for mortality if available
                    mortality_count = float(Mortality.objects.filter(
                        pond_id=pond_id, species_id=species_id, pond__user=request.user
                    ).aggregate(total=Sum('count'))['total'] or 0)
                    
                    # Adjust for harvest if available
                    harvest_count = float(Harvest.objects.filter(
                        pond_id=pond_id, species_id=species_id, pond__user=request.user
                    ).aggregate(total=Sum('total_count'))['total'] or 0)
                    
                    # Calculate current estimated fish count
                    estimated_fish_count = max(0, estimated_fish_count - mortality_count - harvest_count)
                
                # If no stocking data, try to estimate from sampling data
                if not estimated_fish_count and earliest_sampling.fish_per_kg:
                    # This is a rough estimate - use the fish_per_kg from sampling
                    # and assume a reasonable total biomass
                    estimated_fish_count = float(earliest_sampling.fish_per_kg) * 100  # Assume 100kg total biomass as fallback
                
                total_weight_gain_kg = round(estimated_fish_count * weight_gain_per_fish, 4)
                
                # Calculate FCR with 4 decimal places
                fcr = round(total_feed_kg / total_weight_gain_kg, 4) if total_weight_gain_kg > 0 else 0
                
                # Calculate days
                days = (latest_sampling_date - earliest_sampling.date).days
                
                # Calculate average daily feed with 4 decimal places
                avg_daily_feed = round(total_feed_kg / days, 4) if days > 0 else 0
                
                # Calculate average daily weight gain with 4 decimal places
                avg_daily_weight_gain = round(total_weight_gain_kg / days, 4) if days > 0 else 0
                
                fcr_data.append({
                    'pond_id': pond_id,
                    'pond_name': pond.name,
                    'species_id': species_id,
                    'species_name': species.name,
                    'start_date': earliest_sampling.date.isoformat(),
                    'end_date': latest_sampling_date.isoformat(),
                    'days': days,
                    'estimated_fish_count': estimated_fish_count,
                    'initial_weight_kg': initial_weight,
                    'final_weight_kg': final_weight,
                    'weight_gain_per_fish_kg': weight_gain_per_fish,
                    'total_weight_gain_kg': total_weight_gain_kg,
                    'total_feed_kg': total_feed_kg,
                    'avg_daily_feed_kg': avg_daily_feed,
                    'avg_daily_weight_gain_kg': avg_daily_weight_gain,
                    'fcr': fcr,
                    'fcr_status': 'Excellent' if fcr <= 1.2 else 'Good' if fcr <= 1.5 else 'Needs Improvement' if fcr <= 2.0 else 'Poor',
                    'sampling_count': combo_samplings.count(),
                    'feeding_days': combo_feeds.count()
                })
                
                total_feed += total_feed_kg
                total_weight_gain += total_weight_gain_kg
            
            # Calculate overall FCR with 4 decimal places
            overall_fcr = round(total_feed / total_weight_gain, 4) if total_weight_gain > 0 else 0
            
            # Sort by FCR (best first)
            fcr_data.sort(key=lambda x: x['fcr'])
            
            return Response({
                'summary': {
                    'total_feed_kg': round(total_feed, 4),
                    'total_weight_gain_kg': round(total_weight_gain, 4),
                    'overall_fcr': round(overall_fcr, 4),
                    'fcr_status': 'Excellent' if overall_fcr <= 1.2 else 'Good' if overall_fcr <= 1.5 else 'Needs Improvement' if overall_fcr <= 2.0 else 'Poor',
                    'total_combinations': len(fcr_data),
                    'date_range': {
                        'start_date': start_date,
                        'end_date': end_date
                    }
                },
                'fcr_data': fcr_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to calculate FCR analysis: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FeedingAdviceViewSet(viewsets.ModelViewSet):
    """ViewSet for feeding advice"""
    queryset = FeedingAdvice.objects.all()
    serializer_class = FeedingAdviceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = FeedingAdvice.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate_advice(self, request):
        """Generate feeding advice automatically using Google Sheets rules and DB data"""
        try:
            pond_id = request.data.get('pond_id')
            if not pond_id:
                return Response(
                    {'error': 'Pond ID is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the pond
            pond = get_object_or_404(Pond, id=pond_id, user=request.user)
            
            # Get latest stocking data for this pond
            latest_stocking = Stocking.objects.filter(pond=pond).order_by('-date').first()
            if not latest_stocking:
                return Response(
                    {'error': 'No stocking data found for this pond'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get latest fish sampling data for average weight
            latest_sampling = FishSampling.objects.filter(pond=pond).order_by('-date').first()
            
            # Get latest water quality data
            latest_water_quality = DailyLog.objects.filter(pond=pond).order_by('-date').first()
            
            # Calculate estimated fish count (stocked - mortalities)
            total_mortalities = Mortality.objects.filter(pond=pond).aggregate(
                total=Sum('count')
            )['total'] or 0
            
            estimated_fish_count = latest_stocking.pcs - total_mortalities
            if estimated_fish_count <= 0:
                return Response(
                    {'error': 'No fish remaining in pond'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get average fish weight
            if latest_sampling and latest_sampling.average_weight_kg:
                avg_weight = latest_sampling.average_weight_kg
            else:
                # Use initial weight from stocking if no sampling data
                try:
                    avg_weight = latest_stocking.initial_avg_weight_kg or Decimal('0.01')
                except (ValueError, TypeError):
                    avg_weight = Decimal('0.01')
            
            # Get water temperature
            water_temp = None
            if latest_water_quality:
                water_temp = latest_water_quality.water_temp_c
            
            # Determine season based on current date
            current_month = timezone.now().month
            if current_month in [12, 1, 2]:
                season = 'winter'
            elif current_month in [6, 7, 8]:
                season = 'summer'
            else:
                season = 'monsoon'
            
            # Get feed cost (use latest feed cost)
            latest_feed = Feed.objects.filter(pond=pond).order_by('-date').first()
            feed_cost = None
            if latest_feed:
                if latest_feed.cost_per_kg:
                    feed_cost = latest_feed.cost_per_kg
                elif latest_feed.cost_per_packet and latest_feed.packet_size_kg:
                    # Use Decimal division to avoid InvalidOperation
                    from decimal import Decimal, ROUND_HALF_UP
                    try:
                        feed_cost = Decimal(str(latest_feed.cost_per_packet)) / Decimal(str(latest_feed.packet_size_kg))
                        feed_cost = feed_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    except (ValueError, TypeError, ZeroDivisionError):
                        feed_cost = None
            
            # Create feeding advice
            feeding_advice = FeedingAdvice.objects.create(
                pond=pond,
                species=latest_stocking.species,
                user=request.user,
                date=timezone.now().date(),
                estimated_fish_count=estimated_fish_count,
                average_fish_weight_kg=avg_weight,
                water_temp_c=water_temp,
                season=season,
                feed_cost_per_kg=feed_cost,
                notes=f"Auto-generated using Google Sheets feeding rules. Based on {latest_stocking.species.name if latest_stocking.species else 'Mixed'} fish."
            )
            
            # The save() method will automatically calculate all derived fields using feeding bands
            
            serializer = FeedingAdviceSerializer(feeding_advice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Error generating feeding advice: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond, user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def apply_advice(self, request, pk=None):
        """Mark feeding advice as applied"""
        advice = self.get_object()
        advice.is_applied = True
        advice.applied_date = timezone.now()
        advice.save()
        return Response({'status': 'advice applied'})
    
    @action(detail=False, methods=['post'])
    def auto_generate(self, request):
        """Automatically generate feeding advice for a pond - only requires pond selection"""
        # Set required DRF attributes for serializer context
        self.request = request
        self.format_kwarg = None
        
        pond_id = request.data.get('pond')
        
        if not pond_id:
            return Response({'error': 'Pond ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        pond = get_object_or_404(Pond, id=pond_id, user=request.user)
        
        # Get all species in this pond
        species_in_pond = Species.objects.filter(
            stockings__pond=pond
        ).distinct()
        
        if not species_in_pond.exists():
            return Response({'error': 'No species found in this pond. Please add stocking data first.'}, status=status.HTTP_400_BAD_REQUEST)
        
        generated_advice = []
        failed_species = []
        species_without_sampling = []
        
        # Generate advice for each species in the pond
        for species in species_in_pond:
            try:
                # Check if species has fish sampling data (for informational purposes)
                has_sampling = FishSampling.objects.filter(
                    pond=pond, species=species
                ).exists()
                
                if not has_sampling:
                    species_without_sampling.append(species.name)
                
                # Use the existing generate_advice logic but with species parameter
                # This now works with both sampling data and stocking data
                advice_data = self._generate_advice_for_species(pond, species, request)
                if advice_data:
                    serializer = self.get_serializer(data=advice_data)
                    if serializer.is_valid():
                        advice = serializer.save(user=request.user)
                        generated_advice.append(serializer.data)
                    else:
                        failed_species.append(f"{species.name} (validation error)")
                else:
                    failed_species.append(f"{species.name} (no data)")
            except Exception as e:
                failed_species.append(f"{species.name} (error: {str(e)})")
                continue
        
        # Provide detailed error messages
        if not generated_advice:
            error_message = "Unable to generate feeding advice. "
            if failed_species:
                error_message += f"Failed to generate advice for: {', '.join(failed_species)}. "
            if species_without_sampling:
                error_message += f"Note: Some species ({', '.join(species_without_sampling)}) are using stocking data instead of fish sampling data for more accurate results."
            
            return Response({
                'error': error_message,
                'details': {
                    'species_without_sampling': species_without_sampling,
                    'failed_species': failed_species,
                    'total_species_checked': len(species_in_pond)
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Success response with warnings if some species failed
        response_data = {
            'message': f'Generated feeding advice for {len(generated_advice)} species',
            'advice': generated_advice
        }
        
        if species_without_sampling or failed_species:
            response_data['warnings'] = {
                'species_using_stocking_data': species_without_sampling,
                'failed_species': failed_species
            }
            
            if species_without_sampling:
                response_data['message'] += f' (Note: {len(species_without_sampling)} species using stocking data instead of fish sampling)'
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def _generate_advice_for_species(self, pond, species, request):
        """Comprehensive feeding advice generation based on all available data"""
        from django.db.models import Sum, Avg, Count, Max, Min
        from datetime import timedelta
        
        # 1. Get latest fish sampling data
        latest_sampling = FishSampling.objects.filter(
            pond=pond, species=species
        ).order_by('-date').first()
        
        # 2. If no sampling data, try to work with stocking data
        if not latest_sampling:
            return self._generate_advice_from_stocking_data(pond, species, request)
        
        # 2. Calculate current fish count with detailed analysis
        fish_count_analysis = self._analyze_fish_population(pond, species)
        estimated_fish_count = fish_count_analysis['current_count']
        
        # 3. Comprehensive water quality analysis
        water_quality_analysis = self._analyze_water_quality(pond)
        
        # 4. Mortality pattern analysis
        mortality_analysis = self._analyze_mortality_patterns(pond, species)
        
        # 5. Feeding pattern analysis
        feeding_analysis = self._analyze_feeding_patterns(pond, species)
        
        # 6. Environmental and seasonal analysis
        environmental_analysis = self._analyze_environmental_factors(pond)
        
        # 7. Growth rate analysis
        growth_analysis = self._analyze_growth_patterns(pond, species)
        
        # 8. Medical diagnostic analysis
        medical_analysis = self._analyze_medical_conditions(pond)
        
        # 9. Calculate comprehensive feeding recommendations
        feeding_recommendations = self._calculate_feeding_recommendations(
            estimated_fish_count,
            latest_sampling,
            water_quality_analysis,
            mortality_analysis,
            feeding_analysis,
            environmental_analysis,
            growth_analysis,
            medical_analysis
        )
        
        # 9. Enhanced feed type and cost analysis
        feed_analysis = self._analyze_feeding_history(pond, species)
        if feed_analysis:
            feeding_recommendations.update(feed_analysis)
        
        # 10. Add learning from previously applied advice
        advice_learning = self._analyze_applied_advice_history(pond, species, feeding_recommendations['base_rate'])
        if advice_learning:
            feeding_recommendations.update(advice_learning)
        
        # 11. Create comprehensive feeding advice
        advice_data = {
            'pond': pond.id,
            'species': species.id,
            'date': timezone.now().date(),
            'estimated_fish_count': estimated_fish_count,
            'average_fish_weight_kg': latest_sampling.average_weight_kg,
            'total_biomass_kg': estimated_fish_count * float(latest_sampling.average_weight_kg),
            'recommended_feed_kg': feeding_recommendations['recommended_feed_kg'],
            'feeding_rate_percent': feeding_recommendations['final_rate'],
            'feeding_frequency': feeding_recommendations['feeding_frequency'],
            'water_temp_c': water_quality_analysis.get('temperature'),
            'season': environmental_analysis['season'],
            'medical_considerations': self._generate_medical_considerations(medical_analysis),
            'medical_warnings': medical_analysis.get('medical_warnings', []),
            'notes': self._generate_comprehensive_notes(
                pond, species, fish_count_analysis, water_quality_analysis,
                mortality_analysis, feeding_analysis, environmental_analysis,
                growth_analysis, feeding_recommendations, medical_analysis
            )
        }
        
        # Calculate daily feed cost with enhanced cost data
        if 'feed_cost_per_kg' in feeding_recommendations and feeding_recommendations['feed_cost_per_kg']:
            advice_data['daily_feed_cost'] = feeding_recommendations['recommended_feed_kg'] * float(feeding_recommendations['feed_cost_per_kg'])
        
        # Add all analysis data for transparency
        advice_data.update({
            'analysis_data': {
                'fish_count_analysis': fish_count_analysis,
                'water_quality_analysis': water_quality_analysis,
                'mortality_analysis': mortality_analysis,
                'feeding_analysis': feeding_analysis,
                'environmental_analysis': environmental_analysis,
                'growth_analysis': growth_analysis,
                'medical_analysis': medical_analysis,
                'feeding_recommendations': feeding_recommendations
            }
        })
        
        return advice_data
    
    def _generate_advice_from_stocking_data(self, pond, species, request):
        """Generate feeding advice based on stocking data when fish sampling is not available"""
        from django.db.models import Sum, Avg, Count, Max, Min
        from datetime import timedelta
        from decimal import Decimal
        
        # 1. Get latest stocking data
        latest_stocking = Stocking.objects.filter(
            pond=pond, species=species
        ).order_by('-date').first()
        
        if not latest_stocking:
            return None
        
        # 2. Calculate current fish count with detailed analysis
        fish_count_analysis = self._analyze_fish_population(pond, species)
        estimated_fish_count = fish_count_analysis['current_count']
        
        if estimated_fish_count <= 0:
            return None
        
        # 3. Calculate average fish weight from stocking data
        # Use pieces_per_kg from stocking to estimate average weight
        if latest_stocking.pieces_per_kg and latest_stocking.pieces_per_kg > 0:
            average_fish_weight_kg = Decimal('1.0') / latest_stocking.pieces_per_kg
        else:
            # Fallback: estimate based on species and time since stocking
            days_since_stocking = (timezone.now().date() - latest_stocking.date).days
            # Assume initial weight of 0.0025 kg (2.5g) and growth rate of 0.0001 kg/day
            average_fish_weight_kg = Decimal('0.0025') + (Decimal('0.0001') * days_since_stocking)
        
        # 4. Calculate total biomass
        total_biomass_kg = estimated_fish_count * average_fish_weight_kg
        
        # 5. Comprehensive water quality analysis
        water_quality_analysis = self._analyze_water_quality(pond)
        
        # 6. Mortality pattern analysis
        mortality_analysis = self._analyze_mortality_patterns(pond, species)
        
        # 7. Feeding pattern analysis
        feeding_analysis = self._analyze_feeding_patterns(pond, species)
        
        # 8. Environmental and seasonal analysis
        environmental_analysis = self._analyze_environmental_factors(pond)
        
        # 9. Growth rate analysis (simplified for stocking-based advice)
        growth_analysis = self._analyze_growth_patterns_from_stocking(pond, species, latest_stocking)
        
        # 10. Medical diagnostic analysis
        medical_analysis = self._analyze_medical_conditions(pond)
        
        # 11. Calculate feeding recommendations based on stocking data
        feeding_recommendations = self._calculate_feeding_recommendations_from_stocking(
            estimated_fish_count,
            average_fish_weight_kg,
            total_biomass_kg,
            water_quality_analysis,
            mortality_analysis,
            feeding_analysis,
            environmental_analysis,
            growth_analysis,
            medical_analysis
        )
        
        # 12. Enhanced feed type and cost analysis
        feed_analysis = self._analyze_feeding_history(pond, species)
        if feed_analysis:
            feeding_recommendations.update(feed_analysis)
        
        # 13. Add learning from previously applied advice
        advice_learning = self._analyze_applied_advice_history(pond, species, feeding_recommendations['base_rate'])
        if advice_learning:
            feeding_recommendations.update(advice_learning)
        
        # 14. Create comprehensive feeding advice
        advice_data = {
            'pond': pond.id,
            'species': species.id,
            'date': timezone.now().date(),
            'estimated_fish_count': estimated_fish_count,
            'average_fish_weight_kg': average_fish_weight_kg,
            'total_biomass_kg': total_biomass_kg,
            'recommended_feed_kg': feeding_recommendations['recommended_feed_kg'],
            'feeding_rate_percent': feeding_recommendations['final_rate'],
            'feeding_frequency': feeding_recommendations['feeding_frequency'],
            'water_temp_c': water_quality_analysis.get('temperature'),
            'season': environmental_analysis['season'],
            'medical_considerations': self._generate_medical_considerations(medical_analysis),
            'medical_warnings': medical_analysis.get('medical_warnings', []),
            'notes': self._generate_stocking_based_notes(
                pond, species, fish_count_analysis, water_quality_analysis,
                mortality_analysis, feeding_analysis, environmental_analysis,
                growth_analysis, feeding_recommendations, medical_analysis,
                latest_stocking
            )
        }
        
        # Calculate daily feed cost with enhanced cost data
        if 'feed_cost_per_kg' in feeding_recommendations and feeding_recommendations['feed_cost_per_kg']:
            advice_data['daily_feed_cost'] = feeding_recommendations['recommended_feed_kg'] * float(feeding_recommendations['feed_cost_per_kg'])
        
        # Add all analysis data for transparency
        advice_data.update({
            'analysis_data': {
                'fish_count_analysis': fish_count_analysis,
                'water_quality_analysis': water_quality_analysis,
                'mortality_analysis': mortality_analysis,
                'feeding_analysis': feeding_analysis,
                'environmental_analysis': environmental_analysis,
                'growth_analysis': growth_analysis,
                'medical_analysis': medical_analysis,
                'feeding_recommendations': feeding_recommendations,
                'data_source': 'stocking_based'
            }
        })
        
        return advice_data
    
    def _analyze_growth_patterns_from_stocking(self, pond, species, latest_stocking):
        """Simplified growth analysis based on stocking data"""
        from datetime import timedelta
        from decimal import Decimal
        
        days_since_stocking = (timezone.now().date() - latest_stocking.date).days
        
        # Estimate growth based on time since stocking
        if latest_stocking.pieces_per_kg and latest_stocking.pieces_per_kg > 0:
            initial_weight = Decimal('1.0') / latest_stocking.pieces_per_kg
        else:
            initial_weight = Decimal('0.0025')  # 2.5g default
        
        # Estimate current weight (simplified growth model)
        estimated_current_weight = initial_weight + (Decimal('0.0001') * days_since_stocking)
        
        # Calculate daily growth rate
        daily_growth_rate = Decimal('0.0001')  # 0.1g per day
        
        return {
            'initial_weight_kg': initial_weight,
            'estimated_current_weight_kg': estimated_current_weight,
            'daily_growth_rate_kg': daily_growth_rate,
            'days_since_stocking': days_since_stocking,
            'growth_stage': 'juvenile' if estimated_current_weight < Decimal('0.01') else 'adult',
            'data_source': 'stocking_estimated'
        }
    
    def _calculate_feeding_recommendations_from_stocking(self, estimated_fish_count, average_fish_weight_kg, 
                                                       total_biomass_kg, water_quality_analysis, 
                                                       mortality_analysis, feeding_analysis, 
                                                       environmental_analysis, growth_analysis, medical_analysis):
        """Calculate feeding recommendations based on stocking data"""
        from decimal import Decimal
        
        # Base feeding rate (3% of biomass as starting point)
        base_rate = Decimal('3.0')
        
        # Adjust based on fish size
        if average_fish_weight_kg < Decimal('0.01'):  # Less than 10g
            base_rate = Decimal('5.0')  # Higher rate for small fish
        elif average_fish_weight_kg > Decimal('0.5'):  # More than 500g
            base_rate = Decimal('2.0')  # Lower rate for large fish
        
        # Temperature adjustments
        if water_quality_analysis.get('temperature'):
            temp = water_quality_analysis['temperature']
            if temp < 15:
                base_rate *= Decimal('0.5')
            elif temp > 30:
                base_rate *= Decimal('0.8')
        
        # Season adjustments
        season = environmental_analysis.get('season', 'summer')
        if season == 'winter':
            base_rate *= Decimal('0.6')
        elif season == 'summer':
            base_rate *= Decimal('1.2')
        
        # Medical adjustments
        if medical_analysis.get('medical_warnings'):
            base_rate *= Decimal('0.8')  # Reduce feeding if health issues
        
        # Calculate recommended feed amount
        recommended_feed_kg = (total_biomass_kg * base_rate) / 100
        
        # Determine feeding frequency
        feeding_frequency = 2  # Default
        if average_fish_weight_kg < Decimal('0.01'):
            feeding_frequency = 3  # More frequent for small fish
        elif average_fish_weight_kg > Decimal('0.5'):
            feeding_frequency = 1  # Less frequent for large fish
        
        return {
            'base_rate': base_rate,
            'final_rate': base_rate,
            'recommended_feed_kg': recommended_feed_kg,
            'feeding_frequency': feeding_frequency,
            'data_source': 'stocking_based'
        }
    
    def _generate_stocking_based_notes(self, pond, species, fish_count_analysis, water_quality_analysis,
                                     mortality_analysis, feeding_analysis, environmental_analysis,
                                     growth_analysis, feeding_recommendations, medical_analysis, latest_stocking):
        """Generate comprehensive notes for stocking-based feeding advice"""
        notes = []
        
        # Data source note
        notes.append("⚠️ This feeding advice is based on stocking data as fish sampling data is not available.")
        notes.append(f"📊 Based on stocking from {latest_stocking.date} with {latest_stocking.pcs} pieces.")
        
        # Fish count analysis
        if fish_count_analysis.get('survival_rate'):
            notes.append(f"🐟 Estimated survival rate: {fish_count_analysis['survival_rate']:.1f}%")
        
        # Water quality
        if water_quality_analysis.get('temperature'):
            notes.append(f"🌡️ Water temperature: {water_quality_analysis['temperature']}°C")
        
        # Environmental factors
        season = environmental_analysis.get('season', 'summer')
        notes.append(f"🌍 Season: {season.title()}")
        
        # Medical considerations
        if medical_analysis.get('medical_warnings'):
            notes.append("⚠️ Medical warnings detected - consider consulting a fish health specialist.")
        
        # Growth analysis
        if growth_analysis.get('days_since_stocking'):
            days = growth_analysis['days_since_stocking']
            notes.append(f"📈 Days since stocking: {days} days")
        
        # Recommendations
        notes.append(f"💡 Recommended feeding rate: {feeding_recommendations['final_rate']}% of biomass")
        notes.append(f"🍽️ Feeding frequency: {feeding_recommendations['feeding_frequency']} times per day")
        
        # Data limitations
        notes.append("📝 Note: For more accurate feeding advice, consider conducting fish sampling to get current weight and growth data.")
        
        return "\n".join(notes)
    
    def _analyze_feeding_history(self, pond, species):
        """Analyze feeding history to recommend optimal feed type and cost"""
        from django.db.models import Avg, Count, Q
        from datetime import timedelta
        
        # Get recent feeding records (last 30 days)
        recent_feeds = Feed.objects.filter(
            pond=pond,
            date__gte=timezone.now().date() - timedelta(days=30)
        ).order_by('-date')
        
        if not recent_feeds.exists():
            return None
        
        # Analyze feed types by performance
        feed_type_performance = {}
        for feed in recent_feeds:
            if feed.feed_type:
                feed_type_id = feed.feed_type.id
                if feed_type_id not in feed_type_performance:
                    feed_type_performance[feed_type_id] = {
                        'feed_type': feed.feed_type,
                        'total_usage': 0,
                        'avg_cost_per_kg': 0,
                        'usage_count': 0,
                        'recent_usage': 0
                    }
                
                feed_type_performance[feed_type_id]['total_usage'] += float(feed.amount_kg or 0)
                feed_type_performance[feed_type_id]['usage_count'] += 1
                
                # Calculate cost per kg
                if feed.cost_per_kg:
                    cost_per_kg = float(feed.cost_per_kg)
                elif feed.cost_per_packet and feed.packet_size_kg:
                    cost_per_kg = float(feed.cost_per_packet) / float(feed.packet_size_kg)
                else:
                    cost_per_kg = 0
                
                if cost_per_kg > 0:
                    current_avg = feed_type_performance[feed_type_id]['avg_cost_per_kg']
                    count = feed_type_performance[feed_type_id]['usage_count']
                    feed_type_performance[feed_type_id]['avg_cost_per_kg'] = (
                        (current_avg * (count - 1) + cost_per_kg) / count
                    )
                
                # Check if used recently (last 7 days)
                if feed.date >= timezone.now().date() - timedelta(days=7):
                    feed_type_performance[feed_type_id]['recent_usage'] += 1
        
        # Find the most used and cost-effective feed type
        best_feed_type = None
        best_avg_cost = None
        
        if feed_type_performance:
            # Sort by recent usage first, then by total usage
            sorted_types = sorted(
                feed_type_performance.items(),
                key=lambda x: (x[1]['recent_usage'], x[1]['total_usage']),
                reverse=True
            )
            
            best_feed_type_id, best_feed_data = sorted_types[0]
            best_feed_type = best_feed_data['feed_type']
            best_avg_cost = best_feed_data['avg_cost_per_kg']
        
        result = {}
        if best_feed_type:
            result['feed_type'] = best_feed_type.id
            if best_avg_cost and best_avg_cost > 0:
                result['feed_cost_per_kg'] = best_avg_cost
        
        return result
    
    def _analyze_applied_advice_history(self, pond, species, current_base_rate):
        """Analyze previously applied advice to improve recommendations"""
        from django.db.models import Avg, Count
        from datetime import timedelta
        
        # Get previously applied advice for this pond/species
        applied_advice = FeedingAdvice.objects.filter(
            pond=pond,
            species=species,
            is_applied=True
        ).order_by('-applied_date')[:5]  # Last 5 applied advice
        
        if not applied_advice.exists():
            return None
        
        # Analyze the effectiveness of previous advice
        rate_adjustments = []
        feed_adjustments = []
        
        for advice in applied_advice:
            # Get fish sampling data after this advice was applied
            post_advice_samplings = FishSampling.objects.filter(
                pond=pond,
                species=species,
                date__gt=advice.applied_date
            ).order_by('date')[:3]  # Next 3 samplings after advice
            
            if post_advice_samplings.count() >= 2:
                # Calculate growth rate after advice
                first_sampling = post_advice_samplings.first()
                last_sampling = post_advice_samplings.last()
                
                days_diff = (last_sampling.date - first_sampling.date).days
                if days_diff > 0:
                    weight_growth = float(last_sampling.average_weight_kg) - float(first_sampling.average_weight_kg)
                    growth_rate = weight_growth / days_diff
                    
                    # Expected growth rate (industry standard: 0.01-0.02 kg/day for good growth)
                    expected_growth = 0.015  # 1.5g per day average
                    
                    if growth_rate > expected_growth * 1.2:  # Excellent growth
                        # Previous advice worked well, consider similar rate
                        rate_adjustments.append(1.1)  # Slight increase
                        feed_adjustments.append(1.05)
                    elif growth_rate < expected_growth * 0.8:  # Poor growth
                        # Previous advice may have been too aggressive
                        rate_adjustments.append(0.9)  # Slight decrease
                        feed_adjustments.append(0.95)
                    else:  # Normal growth
                        rate_adjustments.append(1.0)  # No change
                        feed_adjustments.append(1.0)
        
        # Calculate average adjustments
        if rate_adjustments:
            avg_rate_adjustment = sum(rate_adjustments) / len(rate_adjustments)
            avg_feed_adjustment = sum(feed_adjustments) / len(feed_adjustments)
            
            # Apply adjustments to current recommendations
            adjusted_rate = current_base_rate * avg_rate_adjustment
            # Note: estimated_fish_count and latest_sampling are from the calling function
            # We'll recalculate the feed amount in the main function
            
            return {
                'final_rate': adjusted_rate,
                'learning_applied': True,
                'historical_analysis': {
                    'previous_advice_count': len(applied_advice),
                    'rate_adjustment_factor': avg_rate_adjustment,
                    'feed_adjustment_factor': avg_feed_adjustment
                }
            }
        
        return None
    
    def _analyze_fish_population(self, pond, species):
        """Comprehensive fish population analysis"""
        from django.db.models import Sum, Count, Avg
        from datetime import timedelta
        
        # Get all stocking records
        stockings = Stocking.objects.filter(pond=pond, species=species).order_by('date')
        total_stocked = stockings.aggregate(total=Sum('pcs'))['total'] or 0
        
        # Get mortality data with time analysis
        recent_mortality = Mortality.objects.filter(
            pond=pond, species=species,
            date__gte=timezone.now().date() - timedelta(days=30)
        ).aggregate(total=Sum('count'))['total'] or 0
        
        total_mortality = Mortality.objects.filter(
            pond=pond, species=species
        ).aggregate(total=Sum('count'))['total'] or 0
        
        # Get harvest data
        total_harvested = Harvest.objects.filter(
            pond=pond, species=species
        ).aggregate(total=Sum('total_count'))['total'] or 0
        
        # Calculate survival rate
        survival_rate = 0
        if total_stocked > 0:
            survival_rate = ((total_stocked - total_mortality - total_harvested) / total_stocked) * 100
        
        # Analyze mortality trends
        mortality_trend = 'stable'
        if recent_mortality > 0:
            avg_daily_mortality = recent_mortality / 30
            if avg_daily_mortality > (total_stocked * 0.001):  # More than 0.1% daily
                mortality_trend = 'high'
            elif avg_daily_mortality < (total_stocked * 0.0001):  # Less than 0.01% daily
                mortality_trend = 'low'
        
        return {
            'total_stocked': total_stocked,
            'total_mortality': total_mortality,
            'recent_mortality_30d': recent_mortality,
            'total_harvested': total_harvested,
            'current_count': max(0, total_stocked - total_mortality - total_harvested),
            'survival_rate': survival_rate,
            'mortality_trend': mortality_trend
        }
    
    def _analyze_water_quality(self, pond):
        """Comprehensive water quality analysis"""
        from django.db.models import Avg, Max, Min
        from datetime import timedelta
        
        # Get recent water samples
        recent_samples = Sampling.objects.filter(
            pond=pond,
            sample_type__name__icontains='water',
            date__gte=timezone.now().date() - timedelta(days=30)
        ).order_by('-date')
        
        # Get recent daily logs
        recent_logs = DailyLog.objects.filter(
            pond=pond,
            date__gte=timezone.now().date() - timedelta(days=7)
        ).order_by('-date')
        
        water_quality = {
            'temperature': None,
            'ph': None,
            'dissolved_oxygen': None,
            'turbidity': None,
            'ammonia': None,
            'nitrite': None,
            'quality_score': 0,
            'quality_status': 'unknown'
        }
        
        # Analyze temperature
        if recent_samples.exists():
            latest_sample = recent_samples.first()
            water_quality['temperature'] = latest_sample.temperature_c
            water_quality['ph'] = latest_sample.ph
            water_quality['dissolved_oxygen'] = latest_sample.dissolved_oxygen
            water_quality['turbidity'] = latest_sample.turbidity
            water_quality['ammonia'] = latest_sample.ammonia
            water_quality['nitrite'] = latest_sample.nitrite
        elif recent_logs.exists():
            latest_log = recent_logs.first()
            water_quality['temperature'] = latest_log.water_temp_c
            water_quality['ph'] = latest_log.ph
        
        # Calculate water quality score (0-100)
        score = 0
        if water_quality['temperature']:
            temp = float(water_quality['temperature'])
            if 20 <= temp <= 28:  # Optimal range
                score += 25
            elif 15 <= temp <= 32:  # Acceptable range
                score += 15
        
        if water_quality['ph']:
            ph = float(water_quality['ph'])
            if 6.5 <= ph <= 8.5:  # Optimal range
                score += 25
            elif 6.0 <= ph <= 9.0:  # Acceptable range
                score += 15
        
        if water_quality['dissolved_oxygen']:
            do = float(water_quality['dissolved_oxygen'])
            if do >= 5:  # Good
                score += 25
            elif do >= 3:  # Acceptable
                score += 15
        
        if water_quality['ammonia']:
            ammonia = float(water_quality['ammonia'])
            if ammonia <= 0.02:  # Safe
                score += 25
            elif ammonia <= 0.05:  # Acceptable
                score += 15
        
        water_quality['quality_score'] = score
        
        # Determine quality status
        if score >= 80:
            water_quality['quality_status'] = 'excellent'
        elif score >= 60:
            water_quality['quality_status'] = 'good'
        elif score >= 40:
            water_quality['quality_status'] = 'fair'
        else:
            water_quality['quality_status'] = 'poor'
        
        return water_quality
    
    def _analyze_mortality_patterns(self, pond, species):
        """Analyze mortality patterns and causes"""
        from django.db.models import Sum, Count, Avg
        from datetime import timedelta
        
        # Get recent mortality data
        recent_mortality = Mortality.objects.filter(
            pond=pond, species=species,
            date__gte=timezone.now().date() - timedelta(days=30)
        )
        
        mortality_analysis = {
            'total_recent_deaths': recent_mortality.aggregate(total=Sum('count'))['total'] or 0,
            'mortality_events': recent_mortality.count(),
            'avg_deaths_per_event': 0,
            'mortality_trend': 'stable',
            'risk_factors': []
        }
        
        if mortality_analysis['mortality_events'] > 0:
            mortality_analysis['avg_deaths_per_event'] = (
                mortality_analysis['total_recent_deaths'] / mortality_analysis['mortality_events']
            )
        
        # Analyze mortality causes
        causes = recent_mortality.values('cause').annotate(
            total_deaths=Sum('count'),
            event_count=Count('id')
        ).order_by('-total_deaths')
        
        mortality_analysis['causes'] = list(causes)
        
        # Determine risk factors
        if mortality_analysis['total_recent_deaths'] > 10:
            mortality_analysis['risk_factors'].append('high_mortality_rate')
        
        if mortality_analysis['mortality_events'] > 5:
            mortality_analysis['risk_factors'].append('frequent_mortality_events')
        
        # Check for disease-related mortality
        disease_causes = recent_mortality.filter(
            cause__icontains='disease'
        ).aggregate(total=Sum('count'))['total'] or 0
        
        if disease_causes > 0:
            mortality_analysis['risk_factors'].append('disease_present')
        
        return mortality_analysis
    
    def _analyze_feeding_patterns(self, pond, species):
        """Analyze historical feeding patterns and success rates"""
        from django.db.models import Sum, Avg, Count, StdDev
        from datetime import timedelta
        
        # Get recent feeding records (Feed model doesn't have species field, only pond)
        recent_feeds = Feed.objects.filter(
            pond=pond,
            date__gte=timezone.now().date() - timedelta(days=30)
        ).order_by('-date')
        
        feeding_analysis = {
            'total_feed_30d': recent_feeds.aggregate(total=Sum('amount_kg'))['total'] or 0,
            'avg_daily_feed': 0,
            'feeding_consistency': 'unknown',
            'feed_efficiency': 0,
            'cost_analysis': {},
            'feed_types_used': []
        }
        
        if recent_feeds.exists():
            feeding_analysis['avg_daily_feed'] = feeding_analysis['total_feed_30d'] / 30
            
            # Analyze feeding consistency
            daily_feeds = recent_feeds.values('date').annotate(
                daily_total=Sum('amount_kg')
            ).order_by('date')
            
            if daily_feeds.count() > 5:
                amounts = [float(feed['daily_total']) for feed in daily_feeds if feed['daily_total']]
                if amounts:
                    avg_amount = sum(amounts) / len(amounts)
                    variance = sum((x - avg_amount) ** 2 for x in amounts) / len(amounts)
                    std_dev = variance ** 0.5
                    
                    if std_dev < avg_amount * 0.2:  # Less than 20% variation
                        feeding_analysis['feeding_consistency'] = 'very_consistent'
                    elif std_dev < avg_amount * 0.4:  # Less than 40% variation
                        feeding_analysis['feeding_consistency'] = 'consistent'
                    else:
                        feeding_analysis['feeding_consistency'] = 'inconsistent'
            
            # Analyze feed types
            feed_types = recent_feeds.values('feed_type__name').annotate(
                total_amount=Sum('amount_kg'),
                usage_count=Count('id')
            ).order_by('-total_amount')
            
            feeding_analysis['feed_types_used'] = list(feed_types)
            
            # Calculate feed conversion ratio if possible
            # This would require harvest data to be meaningful
        
        return feeding_analysis
    
    def _analyze_environmental_factors(self, pond):
        """Analyze environmental and seasonal factors"""
        from datetime import timedelta
        
        # Determine season
        current_month = timezone.now().month
        if current_month in [12, 1, 2]:
            season = 'winter'
        elif current_month in [3, 4, 5]:
            season = 'spring'
        elif current_month in [6, 7, 8]:
            season = 'summer'
        else:
            season = 'autumn'
        
        # Get recent weather data from daily logs
        recent_logs = DailyLog.objects.filter(
            pond=pond,
            date__gte=timezone.now().date() - timedelta(days=7)
        ).order_by('-date')
        
        environmental_analysis = {
            'season': season,
            'temperature_trend': 'stable',
            'weather_conditions': 'normal',
            'seasonal_factors': []
        }
        
        # Analyze temperature trends
        if recent_logs.exists():
            temps = [log.water_temp_c for log in recent_logs if log.water_temp_c]
            if len(temps) > 1:
                temp_change = temps[0] - temps[-1]
                if temp_change > 2:
                    environmental_analysis['temperature_trend'] = 'warming'
                elif temp_change < -2:
                    environmental_analysis['temperature_trend'] = 'cooling'
        
        # Add seasonal factors
        if season == 'winter':
            environmental_analysis['seasonal_factors'].extend(['low_metabolism', 'reduced_appetite'])
        elif season == 'summer':
            environmental_analysis['seasonal_factors'].extend(['high_metabolism', 'increased_appetite'])
        
        return environmental_analysis
    
    def _analyze_growth_patterns(self, pond, species):
        """Analyze fish growth patterns and trends"""
        from django.db.models import Avg, Count
        from datetime import timedelta
        
        # Get recent fish sampling data
        recent_samplings = FishSampling.objects.filter(
            pond=pond, species=species,
            date__gte=timezone.now().date() - timedelta(days=90)
        ).order_by('date')
        
        growth_analysis = {
            'growth_rate_kg_per_day': 0,
            'growth_trend': 'stable',
            'weight_gain_90d': 0,
            'growth_consistency': 'unknown',
            'growth_quality': 'normal'
        }
        
        if recent_samplings.count() >= 2:
            first_sampling = recent_samplings.first()
            last_sampling = recent_samplings.last()
            
            days_diff = (last_sampling.date - first_sampling.date).days
            if days_diff > 0:
                weight_gain = float(last_sampling.average_weight_kg) - float(first_sampling.average_weight_kg)
                growth_analysis['weight_gain_90d'] = weight_gain
                growth_analysis['growth_rate_kg_per_day'] = weight_gain / days_diff
                
                # Determine growth trend
                if growth_analysis['growth_rate_kg_per_day'] > 0.02:  # > 20g/day
                    growth_analysis['growth_trend'] = 'excellent'
                    growth_analysis['growth_quality'] = 'excellent'
                elif growth_analysis['growth_rate_kg_per_day'] > 0.01:  # > 10g/day
                    growth_analysis['growth_trend'] = 'good'
                    growth_analysis['growth_quality'] = 'good'
                elif growth_analysis['growth_rate_kg_per_day'] > 0.005:  # > 5g/day
                    growth_analysis['growth_trend'] = 'normal'
                    growth_analysis['growth_quality'] = 'normal'
                else:
                    growth_analysis['growth_trend'] = 'slow'
                    growth_analysis['growth_quality'] = 'poor'
        
        return growth_analysis
    
    def _analyze_medical_conditions(self, pond):
        """Analyze medical conditions and their impact on feeding"""
        from datetime import timedelta
        from .models import MedicalDiagnostic
        
        # Get recent medical diagnostics (last 30 days)
        recent_diagnostics = MedicalDiagnostic.objects.filter(
            pond=pond,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).order_by('-created_at')
        
        medical_analysis = {
            'active_diseases': [],
            'disease_severity': 'none',
            'feeding_adjustments': [],
            'medical_warnings': [],
            'recommended_feed_changes': [],
            'treatment_considerations': []
        }
        
        if recent_diagnostics.exists():
            for diagnostic in recent_diagnostics:
                disease_info = {
                    'disease_name': diagnostic.disease_name,
                    'confidence': float(diagnostic.confidence_percentage),
                    'is_applied': diagnostic.is_applied,
                    'created_at': diagnostic.created_at,
                    'treatment': diagnostic.recommended_treatment,
                    'dosage': diagnostic.dosage_application
                }
                medical_analysis['active_diseases'].append(disease_info)
                
                # Determine disease severity and feeding adjustments
                confidence = float(diagnostic.confidence_percentage)
                if confidence >= 80:
                    medical_analysis['disease_severity'] = 'high'
                    medical_analysis['feeding_adjustments'].append({
                        'type': 'reduce_feed',
                        'percentage': 0.5,
                        'reason': f'High confidence disease: {diagnostic.disease_name}'
                    })
                    medical_analysis['medical_warnings'].append(
                        f'⚠️ উচ্চ ঝুঁকি: {diagnostic.disease_name} - খাদ্য পরিমাণ ৫০% কমিয়ে দিন'
                    )
                elif confidence >= 60:
                    medical_analysis['disease_severity'] = 'medium'
                    medical_analysis['feeding_adjustments'].append({
                        'type': 'reduce_feed',
                        'percentage': 0.7,
                        'reason': f'Medium confidence disease: {diagnostic.disease_name}'
                    })
                    medical_analysis['medical_warnings'].append(
                        f'⚠️ মাঝারি ঝুঁকি: {diagnostic.disease_name} - খাদ্য পরিমাণ ৩০% কমিয়ে দিন'
                    )
                else:
                    medical_analysis['disease_severity'] = 'low'
                    medical_analysis['feeding_adjustments'].append({
                        'type': 'monitor',
                        'percentage': 1.0,
                        'reason': f'Low confidence disease: {diagnostic.disease_name}'
                    })
                    medical_analysis['medical_warnings'].append(
                        f'ℹ️ নিম্ন ঝুঁকি: {diagnostic.disease_name} - নিবিড় পর্যবেক্ষণ করুন'
                    )
                
                # Disease-specific feeding recommendations
                disease_name = diagnostic.disease_name.lower()
                if any(keyword in disease_name for keyword in ['bacterial', 'infection', 'septicemia']):
                    medical_analysis['recommended_feed_changes'].append(
                        'ব্যাকটেরিয়াজনিত রোগ - উচ্চ প্রোটিন খাদ্য দিন এবং খাদ্য পরিমাণ কমিয়ে দিন'
                    )
                elif any(keyword in disease_name for keyword in ['parasite', 'worm', 'gill']):
                    medical_analysis['recommended_feed_changes'].append(
                        'পরজীবী রোগ - খাদ্য পরিমাণ কমিয়ে দিন এবং নিয়মিত পর্যবেক্ষণ করুন'
                    )
                elif any(keyword in disease_name for keyword in ['fungal', 'mold']):
                    medical_analysis['recommended_feed_changes'].append(
                        'ছত্রাকজনিত রোগ - খাদ্য গুণমান পরীক্ষা করুন এবং পরিমাণ কমিয়ে দিন'
                    )
                
                # Treatment considerations
                if diagnostic.is_applied:
                    medical_analysis['treatment_considerations'].append(
                        f'চিকিৎসা প্রয়োগ হয়েছে: {diagnostic.recommended_treatment}'
                    )
                else:
                    medical_analysis['treatment_considerations'].append(
                        f'চিকিৎসা প্রয়োগ প্রয়োজন: {diagnostic.recommended_treatment}'
                    )
        
        return medical_analysis
    
    def _generate_medical_considerations(self, medical_analysis):
        """Generate medical considerations text for feeding advice"""
        considerations = []
        
        if medical_analysis['active_diseases']:
            considerations.append("চিকিৎসা সংক্রান্ত বিবেচনা:")
            
            for disease in medical_analysis['active_diseases']:
                status = "প্রয়োগ হয়েছে" if disease['is_applied'] else "প্রয়োগ প্রয়োজন"
                considerations.append(
                    f"- {disease['disease_name']} ({disease['confidence']:.0f}% নিশ্চিত) - {status}"
                )
            
            if medical_analysis['recommended_feed_changes']:
                considerations.append("\nখাদ্য সংক্রান্ত সুপারিশ:")
                for change in medical_analysis['recommended_feed_changes']:
                    considerations.append(f"- {change}")
            
            if medical_analysis['treatment_considerations']:
                considerations.append("\nচিকিৎসা সংক্রান্ত বিবেচনা:")
                for consideration in medical_analysis['treatment_considerations']:
                    considerations.append(f"- {consideration}")
        else:
            considerations.append("কোনো সক্রিয় রোগ নেই - স্বাভাবিক খাদ্য পরিকল্পনা অনুসরণ করুন")
        
        return "\n".join(considerations)
    
    def _get_feeding_stage(self, avg_weight_g):
        """Get feeding stage information based on fish weight using scientific feeding table"""
        
        # Starter: 3000→1000 (0.33→1 g) - 28-20% BW/day
        if avg_weight_g <= 0.33:
            return {
                'stage_name': 'Starter (3000 pcs/kg)',
                'percent_bw_per_day': 28.0,
                'protein_percent': 40,
                'pellet_size': '0.5-0.8 mm',
                'pcs_per_kg': 3000,
                'feeding_frequency': 6,
                'feeding_times': '7:30 • 9:30 • 11:30 • 13:30 • 15:30 • 17:30',
                'feeding_split': '20•20•15•15•15•15%'
            }
        elif avg_weight_g <= 0.67:
            return {
                'stage_name': 'Starter (1500 pcs/kg)',
                'percent_bw_per_day': 24.0,
                'protein_percent': 40,
                'pellet_size': '0.5-0.8 mm',
                'pcs_per_kg': 1500,
                'feeding_frequency': 6,
                'feeding_times': '7:30 • 9:30 • 11:30 • 13:30 • 15:30 • 17:30',
                'feeding_split': '20•20•15•15•15•15%'
            }
        elif avg_weight_g <= 1.0:
            return {
                'stage_name': 'Starter (1000 pcs/kg)',
                'percent_bw_per_day': 20.0,
                'protein_percent': 40,
                'pellet_size': '0.5-0.8 mm',
                'pcs_per_kg': 1000,
                'feeding_frequency': 6,
                'feeding_times': '7:30 • 9:30 • 11:30 • 13:30 • 15:30 • 17:30',
                'feeding_split': '20•20•15•15•15•15%'
            }
        
        # Nursery-1: 1000→200 (1→5 g) - 18-14% BW/day
        elif avg_weight_g <= 2.0:
            return {
                'stage_name': 'Nursery-1 (500 pcs/kg)',
                'percent_bw_per_day': 18.0,
                'protein_percent': 38,
                'pellet_size': '0.8-1.2 mm',
                'pcs_per_kg': 500,
                'feeding_frequency': 5,
                'feeding_times': '7:30 • 10:00 • 12:30 • 15:00 • 17:30',
                'feeding_split': '25•20•20•20•15%'
            }
        elif avg_weight_g <= 5.0:
            return {
                'stage_name': 'Nursery-1 (200 pcs/kg)',
                'percent_bw_per_day': 14.0,
                'protein_percent': 38,
                'pellet_size': '0.8-1.2 mm',
                'pcs_per_kg': 200,
                'feeding_frequency': 5,
                'feeding_times': '7:30 • 10:00 • 12:30 • 15:00 • 17:30',
                'feeding_split': '25•20•20•20•15%'
            }
        
        # Nursery-2: 200→100 (5→10 g) - 11-9% BW/day
        elif avg_weight_g <= 6.7:
            return {
                'stage_name': 'Nursery-2 (150 pcs/kg)',
                'percent_bw_per_day': 11.0,
                'protein_percent': 36,
                'pellet_size': '1.2-1.5 mm',
                'pcs_per_kg': 150,
                'feeding_frequency': 4,
                'feeding_times': '8:00 • 11:00 • 14:00 • 17:00',
                'feeding_split': '30•25•25•20%'
            }
        elif avg_weight_g <= 10.0:
            return {
                'stage_name': 'Nursery-2 (100 pcs/kg)',
                'percent_bw_per_day': 9.0,
                'protein_percent': 36,
                'pellet_size': '1.2-1.5 mm',
                'pcs_per_kg': 100,
                'feeding_frequency': 4,
                'feeding_times': '8:00 • 11:00 • 14:00 • 17:00',
                'feeding_split': '30•25•25•20%'
            }
        
        # Grower-1: 100→40 (10→25 g) - 7-5.5% BW/day
        elif avg_weight_g <= 12.5:
            return {
                'stage_name': 'Grower-1 (80 pcs/kg)',
                'percent_bw_per_day': 7.0,
                'protein_percent': 34,
                'pellet_size': '1.5-2.0 mm',
                'pcs_per_kg': 80,
                'feeding_frequency': 4,
                'feeding_times': '8:00 • 11:00 • 14:30 • 17:30',
                'feeding_split': '30•25•25•20%'
            }
        elif avg_weight_g <= 25.0:
            return {
                'stage_name': 'Grower-1 (40 pcs/kg)',
                'percent_bw_per_day': 5.5,
                'protein_percent': 34,
                'pellet_size': '1.5-2.0 mm',
                'pcs_per_kg': 40,
                'feeding_frequency': 4,
                'feeding_times': '8:00 • 11:00 • 14:30 • 17:30',
                'feeding_split': '30•25•25•20%'
            }
        
        # Grower-2: 40→20 (25→50 g) - 4.8-3.8% BW/day
        elif avg_weight_g <= 33.0:
            return {
                'stage_name': 'Grower-2 (30 pcs/kg)',
                'percent_bw_per_day': 4.8,
                'protein_percent': 32,
                'pellet_size': '2.0-2.5 mm',
                'pcs_per_kg': 30,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 50.0:
            return {
                'stage_name': 'Grower-2 (20 pcs/kg)',
                'percent_bw_per_day': 3.8,
                'protein_percent': 32,
                'pellet_size': '2.0-2.5 mm',
                'pcs_per_kg': 20,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-3: 20→10 (50→100 g) - 3.6-2.8% BW/day
        elif avg_weight_g <= 67.0:
            return {
                'stage_name': 'Grower-3 (15 pcs/kg)',
                'percent_bw_per_day': 3.6,
                'protein_percent': 30,
                'pellet_size': '2.5-3.0 mm',
                'pcs_per_kg': 15,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 100.0:
            return {
                'stage_name': 'Grower-3 (10 pcs/kg)',
                'percent_bw_per_day': 2.8,
                'protein_percent': 30,
                'pellet_size': '2.5-3.0 mm',
                'pcs_per_kg': 10,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-4: 10→6 (100→167 g) - 2.6-2.2% BW/day
        elif avg_weight_g <= 125.0:
            return {
                'stage_name': 'Grower-4 (8 pcs/kg)',
                'percent_bw_per_day': 2.6,
                'protein_percent': 30,
                'pellet_size': '3.0 mm',
                'pcs_per_kg': 8,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 167.0:
            return {
                'stage_name': 'Grower-4 (6 pcs/kg)',
                'percent_bw_per_day': 2.2,
                'protein_percent': 30,
                'pellet_size': '3.0 mm',
                'pcs_per_kg': 6,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-5: 6→4 (167→250 g) - 2.1-1.9% BW/day
        elif avg_weight_g <= 200.0:
            return {
                'stage_name': 'Grower-5 (5 pcs/kg)',
                'percent_bw_per_day': 2.1,
                'protein_percent': 30,
                'pellet_size': '3.0-3.5 mm',
                'pcs_per_kg': 5,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 250.0:
            return {
                'stage_name': 'Grower-5 (4 pcs/kg)',
                'percent_bw_per_day': 1.9,
                'protein_percent': 30,
                'pellet_size': '3.0-3.5 mm',
                'pcs_per_kg': 4,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-6: 4→3 (250→333 g) - 1.9-1.7% BW/day
        elif avg_weight_g <= 300.0:
            return {
                'stage_name': 'Grower-6 (3.3 pcs/kg)',
                'percent_bw_per_day': 1.9,
                'protein_percent': 30,
                'pellet_size': '3.5 mm',
                'pcs_per_kg': 3.3,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 333.0:
            return {
                'stage_name': 'Grower-6 (3 pcs/kg)',
                'percent_bw_per_day': 1.7,
                'protein_percent': 30,
                'pellet_size': '3.5 mm',
                'pcs_per_kg': 3,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-7: 3→2 (333→500 g) - 1.7-1.5% BW/day
        elif avg_weight_g <= 400.0:
            return {
                'stage_name': 'Grower-7 (2.5 pcs/kg)',
                'percent_bw_per_day': 1.7,
                'protein_percent': 30,
                'pellet_size': '3.5-4.0 mm',
                'pcs_per_kg': 2.5,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 500.0:
            return {
                'stage_name': 'Grower-7 (2 pcs/kg)',
                'percent_bw_per_day': 1.5,
                'protein_percent': 30,
                'pellet_size': '3.5-4.0 mm',
                'pcs_per_kg': 2,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-8: 2→1.5 (500→667 g) - 1.5-1.3% BW/day
        elif avg_weight_g <= 600.0:
            return {
                'stage_name': 'Grower-8 (1.7 pcs/kg)',
                'percent_bw_per_day': 1.5,
                'protein_percent': 30,
                'pellet_size': '4.0 mm',
                'pcs_per_kg': 1.7,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 667.0:
            return {
                'stage_name': 'Grower-8 (1.5 pcs/kg)',
                'percent_bw_per_day': 1.3,
                'protein_percent': 30,
                'pellet_size': '4.0 mm',
                'pcs_per_kg': 1.5,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Grower-9: 1.5→1 (667→1000 g) - 1.3-1.1% BW/day
        elif avg_weight_g <= 800.0:
            return {
                'stage_name': 'Grower-9 (1.25 pcs/kg)',
                'percent_bw_per_day': 1.3,
                'protein_percent': 30,
                'pellet_size': '4.0-4.5 mm',
                'pcs_per_kg': 1.25,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        elif avg_weight_g <= 1000.0:
            return {
                'stage_name': 'Grower-9 (1 pcs/kg)',
                'percent_bw_per_day': 1.1,
                'protein_percent': 30,
                'pellet_size': '4.0-4.5 mm',
                'pcs_per_kg': 1,
                'feeding_frequency': 3,
                'feeding_times': '8:00 • 12:30 • 17:00',
                'feeding_split': '40•30•30%'
            }
        
        # Finisher-1: 1→0.75 (1.0→1.5 kg) - 1.1-1.0% BW/day
        elif avg_weight_g <= 1250.0:
            return {
                'stage_name': 'Finisher-1 (0.8 pcs/kg)',
                'percent_bw_per_day': 1.1,
                'protein_percent': 28,
                'pellet_size': '4.5-5.0 mm',
                'pcs_per_kg': 0.8,
            'feeding_frequency': 2,
                'feeding_times': '8:30 • 16:30',
                'feeding_split': '60•40%'
            }
        elif avg_weight_g <= 1500.0:
            return {
                'stage_name': 'Finisher-1 (0.67 pcs/kg)',
                'percent_bw_per_day': 1.0,
                'protein_percent': 28,
                'pellet_size': '4.5-5.0 mm',
                'pcs_per_kg': 0.67,
                'feeding_frequency': 2,
                'feeding_times': '8:30 • 16:30',
                'feeding_split': '60•40%'
            }
        
        # Finisher-2: 0.75→0.5 (1.5→2.0 kg) - 1.0-0.9% BW/day
        elif avg_weight_g <= 1750.0:
            return {
                'stage_name': 'Finisher-2 (0.57 pcs/kg)',
                'percent_bw_per_day': 1.0,
                'protein_percent': 26,
                'pellet_size': '5.0 mm',
                'pcs_per_kg': 0.57,
                'feeding_frequency': 2,
                'feeding_times': '8:30 • 16:30',
                'feeding_split': '60•40%'
            }
        else:  # > 1750g (0.5 pcs/kg)
            return {
                'stage_name': 'Finisher-2 (0.5 pcs/kg)',
                'percent_bw_per_day': 0.9,
                'protein_percent': 26,
                'pellet_size': '5.0 mm',
                'pcs_per_kg': 0.5,
                'feeding_frequency': 2,
                'feeding_times': '8:30 • 16:30',
                'feeding_split': '60•40%'
            }
    
    def _get_feeding_frequency(self, avg_weight_g):
        """Determine feeding frequency based on fish size using scientific feeding stages"""
        feeding_stage = self._get_feeding_stage(avg_weight_g)
        return feeding_stage['feeding_frequency']
    
    def _calculate_feeding_adjustments(self, water_quality, mortality, growth, environmental, feeding):
        """Calculate feeding adjustments based on environmental and health factors"""
        adjustments = {
            'water_quality': 0,
            'temperature': 0,
            'mortality': 0,
            'growth': 0,
            'seasonal': 0,
            'feeding_consistency': 0,
            'total_adjustment': 0
        }
        
        # Water quality adjustments
        if water_quality['quality_status'] == 'poor':
            adjustments['water_quality'] = -20  # Reduce feeding in poor water quality
        elif water_quality['quality_status'] == 'excellent':
            adjustments['water_quality'] = 5   # Slight increase in excellent conditions
        
        # Temperature adjustments
        if water_quality['temperature']:
            temp = float(water_quality['temperature'])
            if temp < 15:
                adjustments['temperature'] = -50  # Significantly reduce in cold water
            elif temp < 20:
                adjustments['temperature'] = -20  # Reduce in cool water
            elif temp < 26:
                adjustments['temperature'] = -10  # Slight reduction below optimal
            elif temp > 30:
                adjustments['temperature'] = -20  # Reduce in very warm water
            elif temp > 35:
                adjustments['temperature'] = -40  # Significantly reduce in hot water
        
        # Mortality adjustments
        if 'high_mortality_rate' in mortality['risk_factors']:
            adjustments['mortality'] = -20  # Reduce feeding if high mortality
        if 'disease_present' in mortality['risk_factors']:
            adjustments['mortality'] = -30  # Further reduce if disease present
        
        # Growth pattern adjustments
        if growth['growth_quality'] == 'excellent':
            adjustments['growth'] = 10  # Slight increase for excellent growth
        elif growth['growth_quality'] == 'poor':
            adjustments['growth'] = -10  # Slight decrease for poor growth
        
        # Seasonal adjustments
        if environmental['season'] == 'winter':
            adjustments['seasonal'] = -40  # Significant reduction in winter
        elif environmental['season'] == 'summer':
            adjustments['seasonal'] = 10  # Increase in summer
        
        # Feeding consistency adjustments
        if feeding['feeding_consistency'] == 'inconsistent':
            adjustments['feeding_consistency'] = -10  # Slight reduction for inconsistent feeding
        
        # Calculate total adjustment (clamp between -50% and +30%)
        adjustments['total_adjustment'] = sum([
            adjustments['water_quality'],
            adjustments['temperature'],
            adjustments['mortality'],
            adjustments['growth'],
            adjustments['seasonal'],
            adjustments['feeding_consistency']
        ])
        
        # Clamp total adjustment to reasonable range
        adjustments['total_adjustment'] = max(-50, min(30, adjustments['total_adjustment']))
        
        return adjustments
    
    def _calculate_medical_adjustments(self, medical_analysis):
        """Calculate feeding adjustments based on medical conditions"""
        medical_adjustment = 0
        
        if medical_analysis['disease_severity'] == 'high':
            # Reduce feeding by 50% for high severity diseases
            medical_adjustment = -50
        elif medical_analysis['disease_severity'] == 'medium':
            # Reduce feeding by 30% for medium severity diseases
            medical_adjustment = -30
        elif medical_analysis['disease_severity'] == 'low':
            # Reduce feeding by 10% for low severity diseases
            medical_adjustment = -10
        
        # Apply additional adjustments based on specific feeding recommendations
        for adjustment in medical_analysis.get('feeding_adjustments', []):
            if adjustment['type'] == 'reduce_feed':
                # Use the most severe reduction
                medical_adjustment = min(medical_adjustment, (adjustment['percentage'] - 1) * 100)
        
        return medical_adjustment
    
    def _calculate_feeding_recommendations(self, fish_count, latest_sampling, water_quality, 
                                         mortality, feeding, environmental, growth, medical):
        """Calculate feeding recommendations using scientific formulas based on %BW/day"""
        
        # Get fish weight in grams
        avg_weight_g = float(latest_sampling.average_weight_kg) * 1000
        
        # Get feeding stage and %BW/day from scientific feeding table
        feeding_stage = self._get_feeding_stage(avg_weight_g)
        base_rate = feeding_stage['percent_bw_per_day']
        protein_requirement = feeding_stage['protein_percent']
        pellet_size = feeding_stage['pellet_size']
        
        # Core formula: Daily feed (kg) = (Number of fish × Average weight (g) ÷ 1000) × (%BW/day ÷ 100)
        total_biomass_kg = (fish_count * avg_weight_g) / 1000
        base_daily_feed_kg = total_biomass_kg * (base_rate / 100)
        
        # Apply environmental and condition adjustments (±10-30%)
        adjustments = self._calculate_feeding_adjustments(
            water_quality, mortality, growth, environmental, feeding
        )
        
        # Apply medical adjustments
        medical_adjustment = self._calculate_medical_adjustments(medical)
        adjustments['medical_adjustment'] = medical_adjustment
        adjustments['total_adjustment'] += medical_adjustment
        
        # Calculate final feeding rate with adjustments
        adjustment_factor = 1 + (adjustments['total_adjustment'] / 100)
        final_rate = base_rate * adjustment_factor
        final_daily_feed_kg = base_daily_feed_kg * adjustment_factor
        
        # Determine feeding frequency based on fish size
        feeding_frequency = self._get_feeding_frequency(avg_weight_g)
        
        return {
            'base_rate': base_rate,
            'final_rate': round(final_rate, 2),
            'recommended_feed_kg': round(final_daily_feed_kg, 2),
            'feeding_frequency': feeding_frequency,
            'protein_requirement': protein_requirement,
            'pellet_size': pellet_size,
            'feeding_stage': feeding_stage['stage_name'],
            'adjustments': adjustments,
            'total_biomass_kg': round(total_biomass_kg, 2),
            'base_daily_feed_kg': round(base_daily_feed_kg, 2)
        }
    
    def _generate_comprehensive_notes(self, pond, species, fish_analysis, water_quality, 
                                    mortality, feeding, environmental, growth, recommendations, medical=None):
        """Generate detailed notes explaining the recommendations"""
        
        notes = [
            f"=== SCIENTIFIC FEEDING ADVICE FOR {species.name.upper()} IN {pond.name.upper()} ===",
            f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            "",
            "📊 SCIENTIFIC FEEDING STAGE ANALYSIS:",
            f"• Current Stage: {recommendations.get('feeding_stage', 'Unknown')}",
            f"• Fish Weight: {float(recommendations.get('total_biomass_kg', 0) / fish_analysis.get('current_count', 1)) * 1000:.1f} g average",
            f"• Pieces per kg: {recommendations.get('pcs_per_kg', 'N/A')}",
            f"• Protein Requirement: {recommendations.get('protein_requirement', 'N/A')}%",
            f"• Recommended Pellet Size: {recommendations.get('pellet_size', 'N/A')}",
            f"• Feeding Frequency: {recommendations.get('feeding_frequency', 'N/A')} times per day",
            f"• Feeding Times: {recommendations.get('feeding_times', 'N/A')}",
            f"• Feeding Split: {recommendations.get('feeding_split', 'N/A')}",
            "",
            "🧮 DAILY FEEDING CALCULATION:",
            f"• Formula: Daily feed (kg) = (Fish count × Avg weight (g) ÷ 1000) × (%BW/day ÷ 100)",
            f"• Fish Count: {fish_analysis.get('current_count', 0):,} fish",
            f"• Total Biomass: {recommendations.get('total_biomass_kg', 0):.2f} kg",
            f"• Base %BW/day: {recommendations.get('base_rate', 0):.1f}%",
            f"• Base Daily Feed: {recommendations.get('base_daily_feed_kg', 0):.2f} kg",
            f"• Final %BW/day: {recommendations.get('final_rate', 0):.1f}% (after adjustments)",
            f"• Final Daily Feed: {recommendations.get('recommended_feed_kg', 0):.2f} kg",
            f"• Feeding Frequency: {recommendations.get('feeding_frequency', 2)} times per day",
            "",
            "⚖️ FEEDING ADJUSTMENTS:",
            f"• Water Quality: {recommendations.get('adjustments', {}).get('water_quality', 0):+.0f}%",
            f"• Temperature: {recommendations.get('adjustments', {}).get('temperature', 0):+.0f}%",
            f"• Mortality Risk: {recommendations.get('adjustments', {}).get('mortality', 0):+.0f}%",
            f"• Growth Quality: {recommendations.get('adjustments', {}).get('growth', 0):+.0f}%",
            f"• Seasonal: {recommendations.get('adjustments', {}).get('seasonal', 0):+.0f}%",
            f"• Feeding Consistency: {recommendations.get('adjustments', {}).get('feeding_consistency', 0):+.0f}%",
            f"• Total Adjustment: {recommendations.get('adjustments', {}).get('total_adjustment', 0):+.0f}%",
            "",
            "=== FISH POPULATION ANALYSIS ===",
            f"Current fish count: {fish_analysis['current_count']:,}",
            f"Survival rate: {fish_analysis['survival_rate']:.1f}%",
            f"Mortality trend: {fish_analysis['mortality_trend']}",
            "",
            "=== WATER QUALITY ANALYSIS ===",
            f"Quality status: {water_quality['quality_status'].upper()} (Score: {water_quality['quality_score']}/100)",
            f"Temperature: {water_quality['temperature']}°C" if water_quality['temperature'] else "Temperature: Not available",
            f"pH: {water_quality['ph']}" if water_quality['ph'] else "pH: Not available",
            f"Dissolved Oxygen: {water_quality['dissolved_oxygen']} mg/L" if water_quality['dissolved_oxygen'] else "Dissolved Oxygen: Not available",
            "",
            "=== MORTALITY ANALYSIS ===",
            f"Recent deaths (30d): {mortality['total_recent_deaths']}",
            f"Mortality events: {mortality['mortality_events']}",
            f"Risk factors: {', '.join(mortality['risk_factors']) if mortality['risk_factors'] else 'None identified'}",
            "",
            "=== FEEDING PATTERN ANALYSIS ===",
            f"Average daily feed (30d): {feeding['avg_daily_feed']:.2f} kg",
            f"Feeding consistency: {feeding['feeding_consistency']}",
            f"Feed types used: {len(feeding['feed_types_used'])}",
            "",
            "=== GROWTH ANALYSIS ===",
            f"Growth rate: {growth['growth_rate_kg_per_day']:.4f} kg/day",
            f"Growth trend: {growth['growth_trend']}",
            f"Growth quality: {growth['growth_quality']}",
            "",
            "=== ENVIRONMENTAL FACTORS ===",
            f"Season: {environmental['season'].title()}",
            f"Temperature trend: {environmental['temperature_trend']}",
            f"Seasonal factors: {', '.join(environmental['seasonal_factors'])}",
            "",
        ]
        
        # Add medical considerations if available
        if medical and medical.get('active_diseases'):
            notes.extend([
                "=== MEDICAL CONSIDERATIONS ===",
                f"Disease severity: {medical['disease_severity'].title()}",
                f"Active diseases: {len(medical['active_diseases'])}",
            ])
            
            for disease in medical['active_diseases']:
                status = "Applied" if disease['is_applied'] else "Pending"
                notes.append(f"• {disease['disease_name']} ({disease['confidence']:.0f}% confidence) - {status}")
            
            if medical.get('medical_warnings'):
                notes.append("Medical warnings:")
                for warning in medical['medical_warnings']:
                    notes.append(f"• {warning}")
            
            if medical.get('recommended_feed_changes'):
                notes.append("Feed recommendations:")
                for change in medical['recommended_feed_changes']:
                    notes.append(f"• {change}")
            
            notes.append("")
        
        notes.extend([
            "=== RECOMMENDATIONS ===",
            f"Recommended feeding rate: {recommendations['final_rate']:.1f}% of biomass",
            f"Daily feed amount: {recommendations['recommended_feed_kg']:.2f} kg",
            f"Feeding frequency: {recommendations['feeding_frequency']} times per day",
            "",
            "=== ADJUSTMENT FACTORS APPLIED ===",
            f"Water quality impact: {recommendations['adjustments']['water_quality']:+.0f}%",
            f"Temperature impact: {recommendations['adjustments']['temperature']:+.0f}%",
            f"Mortality risk level: {recommendations['adjustments']['mortality']:+.0f}%",
            f"Growth quality: {recommendations['adjustments']['growth']:+.0f}%",
            f"Seasonal impact: {recommendations['adjustments']['seasonal']:+.0f}%",
        ])
        
        # Add medical adjustment if available
        if medical and 'medical_adjustment' in recommendations['adjustments']:
            notes.append(f"Medical conditions impact: {recommendations['adjustments']['medical_adjustment']:+.0f}%")
        
        notes.extend([
            f"Total adjustment: {recommendations['adjustments']['total_adjustment']:+.0f}%",
        ])
        
        return '\n'.join(notes)


class SurvivalRateViewSet(viewsets.ModelViewSet):
    """ViewSet for survival rate tracking"""
    queryset = SurvivalRate.objects.all()
    serializer_class = SurvivalRateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = SurvivalRate.objects.filter(pond__user=self.request.user)
        
        # Filter by pond
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by species
        species_id = self.request.query_params.get('species')
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        return queryset
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond)
    
    @action(detail=False, methods=['post'])
    def calculate_survival(self, request):
        """Calculate comprehensive survival rate for a pond and species"""
        pond_id = request.data.get('pond')
        species_id = request.data.get('species')
        
        if not pond_id:
            return Response({'error': 'Pond ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        pond = get_object_or_404(Pond, id=pond_id, user=request.user)
        
        # Get latest stocking data
        latest_stocking = Stocking.objects.filter(
            pond=pond, species_id=species_id
        ).order_by('-date').first()
        
        if not latest_stocking:
            return Response({'error': 'No stocking data available'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate totals
        total_mortality = Mortality.objects.filter(
            pond=pond, species_id=species_id
        ).aggregate(total=Sum('count'))['total'] or 0
        
        total_harvested = Harvest.objects.filter(
            pond=pond, species_id=species_id
        ).aggregate(total=Sum('total_count'))['total'] or 0
        
        current_alive = max(0, latest_stocking.pcs - total_mortality - total_harvested)
        
        # Calculate total survival weight in kg
        # Get latest fish sampling for average weight
        latest_sampling = FishSampling.objects.filter(
            pond=pond, species_id=species_id
        ).order_by('-date').first()
        
        avg_weight_kg = 0
        if latest_sampling:
            avg_weight_kg = latest_sampling.average_weight_kg
        else:
            # Fallback to initial average weight from stocking
            avg_weight_kg = latest_stocking.initial_avg_weight_kg
        
        total_survival_kg = current_alive * avg_weight_kg
        
        # Calculate mortality weight
        total_mortality_weight = Mortality.objects.filter(
            pond=pond, species_id=species_id
        ).aggregate(total=Sum('total_weight_kg'))['total'] or 0
        
        # Calculate harvested weight
        total_harvested_weight = Harvest.objects.filter(
            pond=pond, species_id=species_id
        ).aggregate(total=Sum('total_weight_kg'))['total'] or 0
        
        # Generate comprehensive notes
        notes_parts = [
            f"Calculated on {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            f"Initial stocking: {latest_stocking.pcs} fish ({latest_stocking.stocking_date})",
            f"Current alive: {current_alive} fish",
            f"Total mortality: {total_mortality} fish ({total_mortality_weight:.2f} kg)",
            f"Total harvested: {total_harvested} fish ({total_harvested_weight:.2f} kg)",
            f"Average weight: {avg_weight_kg:.3f} kg/fish",
            f"Total survival weight: {total_survival_kg:.2f} kg"
        ]
        
        # Create survival rate record
        survival_data = {
            'pond': pond.id,
            'species': species_id,
            'date': timezone.now().date(),
            'initial_stocked': latest_stocking.pcs,
            'current_alive': current_alive,
            'total_harvested': total_harvested,
            'notes': ' | '.join(notes_parts)
        }
        
        serializer = self.get_serializer(data=survival_data)
        if serializer.is_valid():
            survival_rate = serializer.save()
            # Update the total_survival_kg field
            survival_rate.total_survival_kg = total_survival_kg
            survival_rate.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TargetBiomassViewSet(viewsets.ViewSet):
    """ViewSet for target biomass calculations"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate target biomass requirements and feeding recommendations"""
        try:
            # Get input parameters
            pond_id = request.data.get('pond_id')
            species_id = request.data.get('species_id')
            target_biomass_kg = request.data.get('target_biomass_kg')
            current_date = request.data.get('current_date')
            
            # Validate required fields
            if not all([pond_id, species_id, target_biomass_kg, current_date]):
                return Response({
                    'error': 'Missing required fields: pond_id, species_id, target_biomass_kg, current_date'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate numeric values
            try:
                target_biomass_kg = float(target_biomass_kg)
            except (ValueError, TypeError):
                return Response({
                    'error': 'target_biomass_kg must be a valid number'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate target biomass value
            if target_biomass_kg <= 0:
                return Response({
                    'error': 'Target biomass must be greater than 0'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get pond and species
            pond = get_object_or_404(Pond, id=pond_id, user=request.user)
            species = get_object_or_404(Species, id=species_id)
            
            # Calculate current biomass from latest fish sampling data
            latest_sampling = FishSampling.objects.filter(
                pond=pond, species=species
            ).order_by('-date').first()
            
            if not latest_sampling:
                return Response({
                    'error': 'No fish sampling data available for this pond and species. Please add fish sampling data first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate current biomass using the same method as biomass analysis
            # This should show TOTAL current biomass (initial + growth), not just growth
            # This ensures consistency with the biomass analysis report
            
            # Get latest stocking data
            latest_stocking = Stocking.objects.filter(
                pond=pond, species=species
            ).order_by('-date').first()
            
            if not latest_stocking:
                return Response({
                    'error': 'No stocking data available for this pond and species.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate cumulative biomass change from all samplings
            cumulative_biomass_change = 0
            all_samplings = FishSampling.objects.filter(
                pond=pond, species=species
            ).order_by('date')
            
            for sampling in all_samplings:
                if sampling.biomass_difference_kg:
                    cumulative_biomass_change += float(sampling.biomass_difference_kg)
            
            # Current biomass = Initial stocking + Cumulative growth (same as biomass analysis)
            initial_biomass_kg = float(latest_stocking.total_weight_kg)
            current_biomass_kg = initial_biomass_kg + cumulative_biomass_change
            
            # Validate that target biomass is greater than current biomass
            if target_biomass_kg <= current_biomass_kg:
                return Response({
                    'error': f'Target biomass ({target_biomass_kg} kg) must be greater than current biomass ({current_biomass_kg:.1f} kg)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate biomass gap
            biomass_gap_kg = target_biomass_kg - current_biomass_kg
            
            # Calculate actual growth rate from fish sampling data and stocking
            # This provides a more accurate and dynamic growth rate calculation
            all_samplings_for_growth = FishSampling.objects.filter(
                pond=pond, species=species
            ).order_by('date')
            
            growth_rate_kg_per_day = 0.005  # Default conservative growth rate
            growth_calculation_method = "default"
            
            if all_samplings_for_growth.count() >= 1:
                # Method 1: Calculate from first sampling to latest sampling (includes stocking comparison)
                first_sampling = all_samplings_for_growth.first()
                latest_sampling = all_samplings_for_growth.last()
                
                # Calculate total growth period from stocking to latest sampling
                total_days = (latest_sampling.date - latest_stocking.date).days
                
                if total_days > 0:
                    # Calculate per-fish growth rate from stocking to latest sampling
                    initial_avg_weight = float(latest_stocking.total_weight_kg) / float(latest_stocking.pcs)
                    current_avg_weight = float(latest_sampling.average_weight_kg)
                    weight_gain_per_fish = current_avg_weight - initial_avg_weight
                    
                    # Growth rate per fish per day
                    growth_rate_kg_per_day = weight_gain_per_fish / total_days
                    growth_calculation_method = "stocking_to_latest"
                    
                    # Ensure realistic growth rate (not too high or too low)
                    growth_rate_kg_per_day = max(growth_rate_kg_per_day, 0.001)  # Minimum 0.001 kg/day per fish
                    growth_rate_kg_per_day = min(growth_rate_kg_per_day, 0.1)    # Maximum 0.1 kg/day per fish
                
                # Method 2: If we have multiple samplings, also calculate from sampling intervals
                if all_samplings_for_growth.count() >= 2:
                    sampling_growth_rates = []
                    
                    for i in range(1, len(all_samplings_for_growth)):
                        current_sampling = all_samplings_for_growth[i]
                        previous_sampling = all_samplings_for_growth[i-1]
                        
                        days_diff = (current_sampling.date - previous_sampling.date).days
                        if days_diff > 0:
                            # Calculate per-fish growth rate between samplings
                            weight_gain_per_fish = float(current_sampling.average_weight_kg) - float(previous_sampling.average_weight_kg)
                            if weight_gain_per_fish > 0:  # Only consider positive growth
                                period_growth_rate = weight_gain_per_fish / days_diff
                                sampling_growth_rates.append(period_growth_rate)
                    
                    # If we have sampling-based growth rates, use weighted average
                    if sampling_growth_rates:
                        # Weight recent growth rates more heavily
                        if len(sampling_growth_rates) >= 2:
                            # Use average of recent growth rates
                            recent_growth_rate = sum(sampling_growth_rates[-2:]) / len(sampling_growth_rates[-2:])
                            # Blend with overall growth rate (70% recent, 30% overall)
                            growth_rate_kg_per_day = (recent_growth_rate * 0.7) + (growth_rate_kg_per_day * 0.3)
                            growth_calculation_method = "blended_recent_and_overall"
                        else:
                            # Use the single sampling growth rate
                            growth_rate_kg_per_day = sampling_growth_rates[0]
                            growth_calculation_method = "single_sampling_period"
                        
                        # Ensure realistic bounds
                        growth_rate_kg_per_day = max(growth_rate_kg_per_day, 0.001)
                        growth_rate_kg_per_day = min(growth_rate_kg_per_day, 0.1)
            
            # Calculate feed conversion ratio from feeding logs and biomass data
            feed_conversion_ratio = 1.5  # Default FCR
            fcr_calculation_method = "default"
            feeding_analysis = {}
            
            # Get all feeding data for this pond and species
            all_feeding = Feed.objects.filter(pond=pond).order_by('date')
            feeding_analysis['total_feeding_records'] = all_feeding.count()
            
            if all_feeding.exists():
                # Calculate FCR from stocking to latest sampling
                feeding_from_stocking = all_feeding.filter(date__gte=latest_stocking.date)
                total_feed_consumed = feeding_from_stocking.aggregate(total=Sum('amount_kg'))['total'] or 0
                
                # Total biomass gain from stocking to latest sampling
                total_biomass_gain = cumulative_biomass_change
                
                if total_biomass_gain > 0 and total_feed_consumed > 0:
                    feed_conversion_ratio = float(total_feed_consumed) / total_biomass_gain
                    fcr_calculation_method = "stocking_to_latest"
                    feeding_analysis['fcr_from_stocking'] = feed_conversion_ratio
                    feeding_analysis['total_feed_consumed'] = float(total_feed_consumed)
                    feeding_analysis['total_biomass_gain'] = total_biomass_gain
                
                # If we have multiple samplings, calculate FCR for each period
                if all_samplings_for_growth.count() >= 2:
                    period_fcrs = []
                    
                    for i in range(1, len(all_samplings_for_growth)):
                        current_sampling = all_samplings_for_growth[i]
                        previous_sampling = all_samplings_for_growth[i-1]
                        
                        # Get feeding data for this period
                        period_feeding = all_feeding.filter(
                            date__gt=previous_sampling.date,
                            date__lte=current_sampling.date
                        ).aggregate(total=Sum('amount_kg'))['total'] or 0
                        
                        # Get biomass gain for this period
                        if current_sampling.biomass_difference_kg:
                            period_biomass_gain = float(current_sampling.biomass_difference_kg)
                            
                            if period_biomass_gain > 0 and period_feeding > 0:
                                period_fcr = float(period_feeding) / period_biomass_gain
                                period_fcrs.append(period_fcr)
                    
                    # Use average of period FCRs if available
                    if period_fcrs:
                        avg_period_fcr = sum(period_fcrs) / len(period_fcrs)
                        # Weight recent FCRs more heavily
                        if len(period_fcrs) >= 2:
                            recent_fcr = sum(period_fcrs[-2:]) / len(period_fcrs[-2:])
                            feed_conversion_ratio = (recent_fcr * 0.7) + (avg_period_fcr * 0.3)
                            fcr_calculation_method = "weighted_recent_periods"
                        else:
                            feed_conversion_ratio = avg_period_fcr
                            fcr_calculation_method = "single_period"
                        
                        feeding_analysis['period_fcrs'] = period_fcrs
                        feeding_analysis['avg_period_fcr'] = avg_period_fcr
                
                # Get recent feeding patterns (last 30 days)
                from datetime import timedelta
                recent_cutoff = latest_sampling.date - timedelta(days=30)
                recent_feeding = all_feeding.filter(date__gte=recent_cutoff)
                feeding_analysis['recent_feeding_records'] = recent_feeding.count()
                recent_total_feed = recent_feeding.aggregate(total=Sum('amount_kg'))['total'] or 0
                feeding_analysis['recent_total_feed'] = float(recent_total_feed)
                
                # Calculate daily feeding rate
                if recent_feeding.exists():
                    days_span = (latest_sampling.date - recent_cutoff).days
                    if days_span > 0:
                        daily_feeding_rate = float(recent_total_feed) / days_span
                        feeding_analysis['daily_feeding_rate'] = daily_feeding_rate
                
                # Ensure realistic FCR bounds
                feed_conversion_ratio = max(feed_conversion_ratio, 0.8)  # Minimum FCR
                feed_conversion_ratio = min(feed_conversion_ratio, 3.0)  # Maximum FCR
            
            # Calculate estimated days to reach target
            # Convert per-fish growth rate to total biomass growth rate
            current_fish_count = latest_stocking.pcs  # Use initial stocking count as current count
            total_biomass_growth_rate = growth_rate_kg_per_day * current_fish_count
            estimated_days = int(biomass_gap_kg / total_biomass_growth_rate) if total_biomass_growth_rate > 0 else 365
            
            # Calculate feed requirements
            estimated_feed_kg = biomass_gap_kg * feed_conversion_ratio
            daily_feed_kg = estimated_feed_kg / estimated_days if estimated_days > 0 else 0
            
            # Calculate target date
            from datetime import datetime, timedelta
            current_date_obj = datetime.strptime(current_date, '%Y-%m-%d').date()
            target_date = current_date_obj + timedelta(days=estimated_days)
            
            # Generate recommendations
            recommendations = []
            warnings = []
            
            # Growth rate recommendations
            if growth_rate_kg_per_day < 0.003:
                recommendations.append("Consider increasing feeding frequency or improving feed quality to boost growth rate")
                warnings.append("Current growth rate is below optimal levels")
            elif growth_rate_kg_per_day > 0.01:
                recommendations.append("Excellent growth rate! Maintain current feeding practices")
            
            # Feed conversion ratio recommendations
            if feed_conversion_ratio > 2.0:
                recommendations.append("Feed conversion ratio is high. Consider optimizing feeding practices or feed quality")
                warnings.append("High feed conversion ratio may indicate inefficient feeding")
            elif feed_conversion_ratio < 1.2:
                recommendations.append("Excellent feed conversion ratio! Very efficient feeding")
            
            # Timeline recommendations
            if estimated_days > 365:
                recommendations.append("Target timeline is over 1 year. Consider setting more realistic short-term targets")
                warnings.append("Long timeline may indicate unrealistic target or poor growth conditions")
            elif estimated_days < 30:
                recommendations.append("Very aggressive timeline. Monitor fish health closely during rapid growth")
                warnings.append("Rapid growth may stress fish and affect quality")
            
            # Feeding recommendations
            if daily_feed_kg > current_biomass_kg * 0.05:  # More than 5% of biomass per day
                recommendations.append("High daily feed requirement. Consider splitting into multiple feedings per day")
                warnings.append("High feeding rate may cause water quality issues")
            
            # Environmental recommendations
            recommendations.append("Monitor water quality parameters (pH, temperature, dissolved oxygen) regularly")
            recommendations.append("Consider seasonal adjustments to feeding rates")
            
            # Cost considerations
            recent_feed_cost = Feed.objects.filter(pond=pond).order_by('-date').first()
            if recent_feed_cost and recent_feed_cost.cost_per_packet:
                estimated_feed_cost = (float(estimated_feed_kg) / 25) * float(recent_feed_cost.cost_per_packet)
                recommendations.append(f"Estimated feed cost: ₹{estimated_feed_cost:.2f} (based on recent feed prices)")
            
            # Add current biomass information to recommendations
            recommendations.append(f"Current total biomass: {current_biomass_kg:.1f}kg (Initial: {initial_biomass_kg:.1f}kg + Growth: {cumulative_biomass_change:.1f}kg)")
            recommendations.append(f"Average fish weight: {float(latest_sampling.average_weight_kg):.3f} kg")
            
            # Add growth rate information with calculation method
            if growth_calculation_method == "stocking_to_latest":
                recommendations.append(f"Per-fish growth rate: {growth_rate_kg_per_day:.4f} kg/day per fish")
                recommendations.append(f"Total biomass growth rate: {total_biomass_growth_rate:.1f} kg/day (for {current_fish_count} fish)")
            elif growth_calculation_method == "blended_recent_and_overall":
                recommendations.append(f"Per-fish growth rate (weighted): {growth_rate_kg_per_day:.4f} kg/day per fish")
                recommendations.append(f"Total biomass growth rate: {total_biomass_growth_rate:.1f} kg/day (for {current_fish_count} fish)")
            elif growth_calculation_method == "single_sampling_period":
                recommendations.append(f"Per-fish growth rate: {growth_rate_kg_per_day:.4f} kg/day per fish")
                recommendations.append(f"Total biomass growth rate: {total_biomass_growth_rate:.1f} kg/day (for {current_fish_count} fish)")
            else:
                recommendations.append(f"Using default growth rate: {growth_rate_kg_per_day:.4f} kg/day per fish (insufficient sampling data)")
                recommendations.append(f"Total biomass growth rate: {total_biomass_growth_rate:.1f} kg/day (for {current_fish_count} fish)")
            
            # Add growth period information
            if all_samplings_for_growth.count() >= 1:
                total_growth_days = (latest_sampling.date - latest_stocking.date).days
                recommendations.append(f"Growth period analyzed: {total_growth_days} days from stocking to latest sampling")
            
            # Add feeding analysis information
            if fcr_calculation_method == "stocking_to_latest":
                recommendations.append(f"Feed Conversion Ratio: {feed_conversion_ratio:.2f} (calculated from {feeding_analysis.get('total_feeding_records', 0)} feeding records)")
                recommendations.append(f"Total feed consumed: {feeding_analysis.get('total_feed_consumed', 0):.1f}kg for {feeding_analysis.get('total_biomass_gain', 0):.1f}kg biomass gain")
            elif fcr_calculation_method == "weighted_recent_periods":
                recommendations.append(f"Feed Conversion Ratio: {feed_conversion_ratio:.2f} (weighted average from {len(feeding_analysis.get('period_fcrs', []))} sampling periods)")
                recommendations.append(f"Average period FCR: {feeding_analysis.get('avg_period_fcr', 0):.2f}")
            elif fcr_calculation_method == "single_period":
                recommendations.append(f"Feed Conversion Ratio: {feed_conversion_ratio:.2f} (from single sampling period)")
            else:
                recommendations.append(f"Feed Conversion Ratio: {feed_conversion_ratio:.2f} (default - no feeding data available)")
            
            # Add feeding pattern information
            if feeding_analysis.get('recent_feeding_records', 0) > 0:
                recommendations.append(f"Recent feeding: {feeding_analysis.get('recent_feeding_records', 0)} records in last 30 days")
                if feeding_analysis.get('daily_feeding_rate'):
                    recommendations.append(f"Daily feeding rate: {feeding_analysis.get('daily_feeding_rate', 0):.1f}kg/day")
            
            # Add feeding efficiency recommendations
            if feed_conversion_ratio < 1.2:
                recommendations.append("Excellent feed conversion! Maintain current feeding practices")
            elif feed_conversion_ratio < 1.8:
                recommendations.append("Good feed conversion. Consider optimizing feeding times and amounts")
            else:
                recommendations.append("Feed conversion could be improved. Review feeding schedule and water quality")
                warnings.append("High FCR may indicate overfeeding or poor water quality")
            
            return Response({
                'current_biomass_kg': current_biomass_kg,
                'target_biomass_kg': target_biomass_kg,
                'biomass_gap_kg': biomass_gap_kg,
                'estimated_days': estimated_days,
                'estimated_feed_kg': round(estimated_feed_kg, 2),
                'daily_feed_kg': round(daily_feed_kg, 2),
                'growth_rate_kg_per_day': round(growth_rate_kg_per_day, 4),
                'feed_conversion_ratio': round(feed_conversion_ratio, 2),
                'target_date': target_date.strftime('%Y-%m-%d'),
                'recommendations': recommendations,
                'warnings': warnings
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Failed to calculate target biomass: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MedicalDiagnosticViewSet(viewsets.ModelViewSet):
    """ViewSet for medical diagnostic results"""
    queryset = MedicalDiagnostic.objects.all()
    serializer_class = MedicalDiagnosticSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicalDiagnostic.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def apply_treatment(self, request, pk=None):
        """Mark a diagnostic result as applied"""
        diagnostic = self.get_object()
        diagnostic.is_applied = True
        diagnostic.save()
        
        return Response({
            'message': 'Treatment applied successfully',
            'applied_at': diagnostic.applied_at
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def by_pond(self, request):
        """Get diagnostics for a specific pond"""
        pond_id = request.query_params.get('pond_id')
        if not pond_id:
            return Response({'error': 'pond_id parameter is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        diagnostics = self.get_queryset().filter(pond_id=pond_id)
        serializer = self.get_serializer(diagnostics, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent diagnostics (last 30 days)"""
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        diagnostics = self.get_queryset().filter(created_at__gte=thirty_days_ago)
        serializer = self.get_serializer(diagnostics, many=True)
        return Response(serializer.data)


# ===================== BUSINESS MANAGEMENT VIEWSETS =====================

class PaymentTermsViewSet(viewsets.ModelViewSet):
    """ViewSet for payment terms management"""
    queryset = PaymentTerms.objects.all()
    serializer_class = PaymentTermsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for customer management"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Customer.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AccountViewSet(viewsets.ModelViewSet):
    """ViewSet for chart of accounts management"""
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get accounts in tree structure"""
        try:
            accounts = self.get_queryset().filter(level=0)  # Get root accounts
            serializer = self.get_serializer(accounts, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def balances(self, request):
        """Get account balances for all accounts"""
        try:
            from django.db.models import Sum, Q
            from decimal import Decimal
            
            accounts = self.get_queryset()
            account_balances = []
            
            for account in accounts:
                balance = Decimal('0.00')
                
                # Calculate balance based on account type and transactions
                if account.account_type == 'Bank':
                    # For bank accounts, deposits increase balance, bill payments decrease balance
                    deposits = Deposit.objects.filter(
                        bank_account=account,
                        user=request.user
                    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                    from .models import BillPayment
                    bill_payments = BillPayment.objects.filter(
                        payment_account=account,
                        user=request.user
                    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                    balance = (deposits or Decimal('0.00')) - (bill_payments or Decimal('0.00'))
                    
                elif account.account_type == 'Accounts Receivable':
                    # For AR, sum all outstanding invoice balances
                    from .models import Invoice
                    ar_balance = Invoice.objects.filter(
                        customer__user=request.user
                    ).aggregate(total=Sum('open_balance'))['total'] or Decimal('0.00')
                    balance = ar_balance
                    
                elif account.account_type == 'Accounts Payable':
                    # For AP, sum all outstanding bill balances
                    from .models import Bill
                    ap_balance = Bill.objects.filter(
                        user=request.user
                    ).aggregate(total=Sum('open_balance'))['total'] or Decimal('0.00')
                    balance = ap_balance

                elif account.account_type == 'Income':
                    # For income accounts, sum all invoice amounts
                    from .models import Invoice
                    income_balance = Invoice.objects.filter(
                        user=request.user
                    ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                    balance = income_balance
                
                account_balances.append({
                    'account_id': account.account_id,
                    'name': account.name,
                    'code': account.code,
                    'account_type': account.account_type,
                    'balance': float(balance),
                    'formatted_balance': f"${balance:,.2f}"
                })
            
            return Response(account_balances)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VendorViewSet(viewsets.ModelViewSet):
    """ViewSet for vendor management"""
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Vendor.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)




class ItemCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for item category management"""
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ItemCategory.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ItemViewSet(viewsets.ModelViewSet):
    """ViewSet for item management"""
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Item.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StockEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for stock entry management"""
    queryset = StockEntry.objects.all()
    serializer_class = StockEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return StockEntry.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_item(self, request):
        """Get stock entries for a specific item"""
        item_id = request.query_params.get('item_id')
        if not item_id:
            return Response({'error': 'item_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            item = Item.objects.get(item_id=item_id, user=request.user)
            entries = StockEntry.objects.filter(item=item, user=request.user)
            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)
        except Item.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)


class BillViewSet(viewsets.ModelViewSet):
    """ViewSet for bill management"""
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Bill.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def next_bill_number(self, request):
        """Get the next auto-generated bill number for the current user"""
        try:
            # Create a temporary bill instance to get the next number
            temp_bill = Bill(user=request.user)
            next_number = temp_bill.get_next_bill_number()
            return Response({'next_bill_number': next_number}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for invoice management"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Invoice.objects.filter(user=self.request.user)
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        return queryset
    
    def perform_create(self, serializer):
        invoice = serializer.save(user=self.request.user)
        
        # Note: Inventory transactions are created when invoice lines are created
        # in InvoiceLineViewSet.perform_create()
        
        # Create journal entries for accounting
        self._create_journal_entries(invoice)
    
    def _create_inventory_transactions(self, invoice):
        """Create inventory transactions for invoice lines"""
        from .models import InventoryTransaction, InventoryTransactionLine
        
        # Create inventory transaction for the invoice
        inv_txn = InventoryTransaction.objects.create(
            user=invoice.user,
            txn_type='SALE_TO_CUSTOMER',
            txn_date=invoice.invoice_date,
            memo=f"Invoice {invoice.invoice_no} - {invoice.customer.name}",
        )
        
        # Create inventory transaction lines for each invoice line
        for line in invoice.lines.all():
            # Create inventory transaction for inventory items
            # Only inventory_part items should deduct from stock
            if line.item.item_type == 'inventory_part':
                # Calculate quantity in kg for feed items
                qty_in_kg = line.qty
                
                # For feed items, convert to kg based on unit
                if line.item.category == 'feed':
                    if line.unit == 'packet' and line.packet_size:
                        # Convert packets to kg: quantity * packet_size
                        qty_in_kg = line.qty * line.packet_size
                    elif line.unit == 'gram':
                        # Convert grams to kg: divide by 1000
                        qty_in_kg = line.qty / 1000
                    elif line.unit == 'ton':
                        # Convert tons to kg: multiply by 1000
                        qty_in_kg = line.qty * 1000
                    # For kg, litre, piece, ml, box, bag, bottle - use as is
                    # (assuming these are already in appropriate units for feed)
                
                InventoryTransactionLine.objects.create(
                    inventory_transaction=inv_txn,
                    item=line.item,
                    qty=-qty_in_kg,  # Negative for issue/sale, now in kg
                    unit_cost=line.rate,
                    memo=f"Sold to {invoice.customer.name} ({line.qty} {line.unit} = {qty_in_kg} kg)",
                )
    
    @action(detail=False, methods=['get'])
    def next_invoice_number(self, request):
        """Get the next auto-generated invoice number"""
        try:
            # Get the last invoice for this user
            last_invoice = Invoice.objects.filter(user=request.user).order_by('-invoice_id').first()
            
            if last_invoice and last_invoice.invoice_no.isdigit():
                next_num = int(last_invoice.invoice_no) + 1
            else:
                next_num = 1
            
            next_invoice_number = str(next_num).zfill(6)
            
            return Response({
                'next_invoice_number': next_invoice_number
            })
        except Exception as e:
            return Response({
                'error': 'Failed to generate invoice number',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _create_journal_entries(self, invoice):
        """Create journal entries for invoice accounting"""
        from .models import JournalEntry, JournalLine
        
        # Create journal entry for the invoice
        je = JournalEntry.objects.create(
            user=invoice.user,
            date=invoice.invoice_date,
            memo=f"Invoice {invoice.invoice_no} - {invoice.customer.name}",
            source='INVOICE',
            source_id=invoice.invoice_id,
        )
        
        # Create journal lines for each invoice line
        for line in invoice.lines.all():
            # Debit: Accounts Receivable (use default AR account or create one)
            ar_account = self._get_or_create_ar_account(invoice.user)
            JournalLine.objects.create(
                journal_entry=je,
                account=ar_account,
                memo=f"{line.item.name} - {line.qty} pcs",
                debit=line.amount,
                credit=0,
            )
            
            # Credit: Income Account (from item's income account)
            if line.item.income_account:
                JournalLine.objects.create(
                    journal_entry=je,
                    account=line.item.income_account,
                    memo=f"Sales - {line.item.name}",
                    debit=0,
                    credit=line.amount,
                )
            
            # If it's an inventory item, also create COGS entry
            if line.item.item_type == 'inventory_part' and line.item.cost_of_goods_sold_account:
                JournalLine.objects.create(
                    journal_entry=je,
                    account=line.item.cost_of_goods_sold_account,
                    memo=f"COGS - {line.item.name}",
                    debit=line.amount,
                    credit=0,
                )
                
                # Credit: Inventory Asset Account
                if line.item.asset_account:
                    JournalLine.objects.create(
                        journal_entry=je,
                        account=line.item.asset_account,
                        memo=f"Inventory - {line.item.name}",
                        debit=0,
                        credit=line.amount,
                    )
    
    def _get_or_create_ar_account(self, user):
        """Get or create default Accounts Receivable account"""
        from .models import Account
        
        ar_account, created = Account.objects.get_or_create(
            user=user,
            name='Accounts Receivable',
            defaults={
                'account_type': 'Accounts Receivable',
                'description': 'Default Accounts Receivable account for customer invoices',
            }
        )
        return ar_account


class InventoryTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory transaction management"""
    queryset = InventoryTransaction.objects.all()
    serializer_class = InventoryTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return InventoryTransaction.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InventoryTransactionLineViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory transaction line management"""
    queryset = InventoryTransactionLine.objects.all()
    serializer_class = InventoryTransactionLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return InventoryTransactionLine.objects.filter(inventory_transaction__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class StockingEventViewSet(viewsets.ModelViewSet):
    """ViewSet for stocking event management"""
    queryset = StockingEvent.objects.all()
    serializer_class = StockingEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = StockingEvent.objects.filter(user=self.request.user)
        
        # Filter by pond if provided
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def lines(self, request, pk=None):
        """Get stocking lines for a specific stocking event"""
        stocking_event = self.get_object()
        lines = StockingLine.objects.filter(stocking_event=stocking_event)
        serializer = StockingLineSerializer(lines, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_line(self, request, pk=None):
        """Add a line to a stocking event"""
        stocking_event = self.get_object()
        serializer = StockingLineSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(stocking_event=stocking_event)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FeedingEventViewSet(viewsets.ModelViewSet):
    """ViewSet for feeding event management"""
    queryset = FeedingEvent.objects.all()
    serializer_class = FeedingEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FeedingEvent.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        feeding_event = serializer.save(user=self.request.user)
        
        # Deduct stock from customer stock if feeding event has feed information
        self._deduct_stock_from_feeding(feeding_event)
    
    def perform_update(self, serializer):
        feeding_event = serializer.save()
        
        # For updates, we might need to handle stock adjustments
        # For now, we'll just deduct stock (in a real system, you'd want to handle reversals)
        self._deduct_stock_from_feeding(feeding_event)
    
    def _deduct_stock_from_feeding(self, feeding_event):
        """Deduct stock from customer stock based on feeding event"""
        try:
            # Use the feed amount directly
            feed_amount = feeding_event.amount_kg
            
            if not feed_amount or not feeding_event.pond or not feeding_event.feed_item:
                return
            
            # Find customer stock for this pond and feed item
            from .models import CustomerStock
            # Get the customer associated with this pond (internal pond type)
            pond_customer = feeding_event.pond.customers.filter(type='internal_pond').first()
            if not pond_customer:
                return
                
            customer_stock = CustomerStock.objects.filter(
                user=feeding_event.user,
                customer=pond_customer,
                pond=feeding_event.pond,
                item=feeding_event.feed_item
            ).first()
            
            if customer_stock:
                # Use the feed amount directly (it's already in the correct unit)
                amount_to_deduct = feed_amount
                
                # Check if sufficient stock is available
                if customer_stock.current_stock >= amount_to_deduct:
                    customer_stock.current_stock -= amount_to_deduct
                    customer_stock.save()
                    
                    # Create inventory transaction record
                    from .models import InventoryTransaction, InventoryTransactionLine
                    transaction = InventoryTransaction.objects.create(
                        user=feeding_event.user,
                        transaction_type='usage',
                        reference_number=f'FEED-{feeding_event.feeding_id}',
                        notes=f'Stock deduction for feeding event {feeding_event.feeding_id}'
                    )
                    
                    InventoryTransactionLine.objects.create(
                        transaction=transaction,
                        item=feeding_event.feed_item,
                        quantity=-amount_to_deduct,  # Negative for deduction
                        unit_cost=customer_stock.unit_cost or 0,
                        total_cost=-(amount_to_deduct * (customer_stock.unit_cost or 0))
                    )
                    
                    # Note: The transaction is created but not directly linked to FeedingEvent
                    # as FeedingEvent doesn't have a direct relationship to InventoryTransaction
                    # The relationship is tracked through the transaction reference number
                else:
                    # Log insufficient stock
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Insufficient stock for feeding event {feeding_event.feeding_id}. "
                                 f"Required: {amount_to_deduct}, Available: {customer_stock.current_stock}")
                    
        except Exception as e:
            # Log error but don't prevent feeding event creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error deducting stock for feeding event {feeding_event.feeding_id}: {e}")


class FeedingLineViewSet(viewsets.ModelViewSet):
    """ViewSet for feeding line management"""
    queryset = FeedingLine.objects.all()
    serializer_class = FeedingLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FeedingLine.objects.filter(feeding_event__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class MedicineEventViewSet(viewsets.ModelViewSet):
    """ViewSet for medicine event management"""
    queryset = MedicineEvent.objects.all()
    serializer_class = MedicineEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicineEvent.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OtherPondEventViewSet(viewsets.ModelViewSet):
    """ViewSet for other pond event management"""
    queryset = OtherPondEvent.objects.all()
    serializer_class = OtherPondEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return OtherPondEvent.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for employee management"""
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Employee.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PayrollRunViewSet(viewsets.ModelViewSet):
    """ViewSet for payroll run management"""
    queryset = PayrollRun.objects.all()
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PayrollRun.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ItemSalesViewSet(viewsets.ModelViewSet):
    """ViewSet for item sales management"""
    queryset = ItemSales.objects.all()
    serializer_class = ItemSalesSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ItemSales.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ItemSalesLineViewSet(viewsets.ModelViewSet):
    """ViewSet for item sales line management"""
    queryset = ItemSalesLine.objects.all()
    serializer_class = ItemSalesLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ItemSalesLine.objects.filter(item_sale__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class MedicineLineViewSet(viewsets.ModelViewSet):
    """ViewSet for medicine line management"""
    queryset = MedicineLine.objects.all()
    serializer_class = MedicineLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MedicineLine.objects.filter(medicine_event__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class BillLineViewSet(viewsets.ModelViewSet):
    """ViewSet for bill line management"""
    queryset = BillLine.objects.all()
    serializer_class = BillLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = BillLine.objects.filter(bill__user=self.request.user)
        
        # Filter by bill ID if provided
        bill_id = self.request.query_params.get('bill')
        if bill_id:
            queryset = queryset.filter(bill_id=bill_id)
        
        return queryset
    
    def perform_create(self, serializer):
        bill_line = serializer.save()
        
        # Create inventory transaction for inventory items
        self._create_inventory_transaction_for_bill_line(bill_line)
    
    def perform_destroy(self, instance):
        """Handle deletion of bill line - remove stock entries and inventory transactions"""
        from .models import InventoryTransactionLine, StockEntry
        
        # Find and delete the corresponding stock entry
        if instance.is_item and instance.item and instance.item.item_type == 'inventory_part':
            # Calculate the stored quantity and unit (same logic as creation)
            storage_unit = instance.unit
            storage_quantity = instance.qty
            
            if (instance.unit in ['packet', 'pack'] and 
                instance.packet_size and 
                instance.item.category == 'feed'):
                storage_unit = 'kg'
                storage_quantity = instance.qty * instance.packet_size
            
            # Find the stock entry for this bill line
            stock_entry = StockEntry.objects.filter(
                user=instance.bill.user,
                item=instance.item,
                quantity=storage_quantity,
                unit=storage_unit,
                packet_size=instance.packet_size,
                gallon_size=instance.gallon_size,
                unit_cost=instance.cost,
                supplier=instance.bill.vendor.name,
                batch_number=f"BILL-{instance.bill.bill_no}",
                entry_date=instance.bill.bill_date
            ).first()
            
            if stock_entry:
                stock_entry.delete()
            
            # Find and delete the corresponding inventory transaction line
            inv_txn_line = InventoryTransactionLine.objects.filter(
                inventory_transaction__user=instance.bill.user,
                inventory_transaction__txn_type='RECEIPT_WITH_BILL',
                inventory_transaction__memo=f"Bill {instance.bill.bill_no} - {instance.bill.vendor.name}",
                item=instance.item,
                qty=instance.qty,  # Match the positive quantity
                unit_cost=instance.cost
            ).first()
            
            if inv_txn_line:
                inv_txn_line.delete()  # This will trigger stock recalculation
        
        # Delete the bill line
        instance.delete()
    
    def _create_inventory_transaction_for_bill_line(self, bill_line):
        """Create stock entry for a bill line (addition to stock)"""
        from .models import InventoryTransaction, InventoryTransactionLine, StockEntry
        
        # Only create stock entry for item lines (not expense lines)
        if bill_line.is_item and bill_line.item and bill_line.item.item_type == 'inventory_part':
            # Determine the unit and quantity for storage
            storage_unit = bill_line.unit
            storage_quantity = bill_line.qty
            
            # Convert packets to kg if needed (for feed items)
            if (bill_line.unit in ['packet', 'pack'] and 
                bill_line.packet_size and 
                bill_line.item.category == 'feed'):
                storage_unit = 'kg'
                storage_quantity = bill_line.qty * bill_line.packet_size
            
            # Create StockEntry record for the new stock addition
            StockEntry.objects.create(
                user=bill_line.bill.user,
                item=bill_line.item,
                quantity=storage_quantity,
                unit=storage_unit,
                packet_size=bill_line.packet_size,
                gallon_size=bill_line.gallon_size,
                unit_cost=bill_line.cost,
                entry_date=bill_line.bill.bill_date,
                supplier=bill_line.bill.vendor.name,
                batch_number=f"BILL-{bill_line.bill.bill_no}",
                notes=f"Received from {bill_line.bill.vendor.name} via Bill {bill_line.bill.bill_no}" + 
                      (f" ({bill_line.qty} {bill_line.unit})" if bill_line.unit != storage_unit else ""),
            )
            
            # Also create inventory transaction for backward compatibility
            # Check if inventory transaction already exists for this bill
            existing_txn = InventoryTransaction.objects.filter(
                user=bill_line.bill.user,
                txn_type='RECEIPT_WITH_BILL',
                memo=f"Bill {bill_line.bill.bill_no} - {bill_line.bill.vendor.name}"
            ).first()
            
            if not existing_txn:
                # Create new inventory transaction for the bill
                existing_txn = InventoryTransaction.objects.create(
                    user=bill_line.bill.user,
                    txn_type='RECEIPT_WITH_BILL',
                    txn_date=bill_line.bill.bill_date,
                    bill=bill_line.bill,  # Link to the bill
                    memo=f"Bill {bill_line.bill.bill_no} - {bill_line.bill.vendor.name}",
                )
            
            # Create inventory transaction line (positive quantity for addition)
            InventoryTransactionLine.objects.create(
                inventory_transaction=existing_txn,
                item=bill_line.item,
                qty=bill_line.qty,  # Positive for receipt/addition
                unit_cost=bill_line.cost,
                memo=f"Received from {bill_line.bill.vendor.name}",
            )


class InvoiceLineViewSet(viewsets.ModelViewSet):
    """ViewSet for invoice line management"""
    queryset = InvoiceLine.objects.all()
    serializer_class = InvoiceLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InvoiceLine.objects.filter(invoice__user=self.request.user)
        
        # Filter by invoice ID if provided
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        
        return queryset
    
    def perform_create(self, serializer):
        # Calculate amount before saving
        data = serializer.validated_data
        
        # For fish items, use total_weight if available, otherwise use qty
        if data.get('item') and data['item'].category == 'fish' and data.get('total_weight'):
            effective_qty = data['total_weight']
        else:
            # If packet_size is provided, multiply quantity by packet_size, otherwise use quantity as is
            effective_qty = data['qty']
            if data.get('packet_size') and data['packet_size'] > 0:
                effective_qty = data['qty'] * data['packet_size']
        
        data['amount'] = effective_qty * data['rate']
        
        invoice_line = serializer.save()
        
        # Create inventory transaction for inventory items
        self._create_inventory_transaction_for_line(invoice_line)
        
        # Create customer stock record for internal customers (ponds)
        self._create_customer_stock_for_line(invoice_line)
    
    def perform_destroy(self, instance):
        """Handle deletion of invoice line - remove stock entries and inventory transactions"""
        from .models import InventoryTransactionLine, StockEntry
        
        # Find and delete the corresponding stock entry
        if instance.item.item_type == 'inventory_part':
            # Find the stock entry for this invoice line
            stock_entry = StockEntry.objects.filter(
                user=instance.invoice.user,
                item=instance.item,
                quantity=-instance.qty,  # Match the negative quantity
                unit_cost=instance.rate,
                supplier=f"SOLD TO {instance.invoice.customer.name}",
                batch_number=f"INVOICE-{instance.invoice.invoice_no}",
                entry_date=instance.invoice.invoice_date
            ).first()
            
            if stock_entry:
                stock_entry.delete()
            
            # Find and delete the corresponding inventory transaction line
            inv_txn_line = InventoryTransactionLine.objects.filter(
                inventory_transaction__user=instance.invoice.user,
                inventory_transaction__txn_type='SALE_TO_CUSTOMER',
                inventory_transaction__memo=f"Invoice {instance.invoice.invoice_no} - {instance.invoice.customer.name}",
                item=instance.item,
                qty=-instance.qty,  # Match the negative quantity
                unit_cost=instance.rate
            ).first()
            
            if inv_txn_line:
                inv_txn_line.delete()  # This will trigger stock recalculation
        
        # Delete the invoice line
        instance.delete()
    
    def _create_inventory_transaction_for_line(self, invoice_line):
        """Create inventory transaction and stock entry for a single invoice line"""
        from .models import InventoryTransaction, InventoryTransactionLine, StockEntry
        
        # Only create inventory transaction for inventory items
        if invoice_line.item.item_type == 'inventory_part':
            # Create StockEntry record for the stock deduction (negative quantity)
            # We'll create a "negative" stock entry to represent the deduction
            StockEntry.objects.create(
                user=invoice_line.invoice.user,
                item=invoice_line.item,
                quantity=-invoice_line.qty,  # Negative quantity for deduction
                unit=invoice_line.unit,  # Use the invoice line's unit instead of hardcoded "pcs"
                packet_size=invoice_line.packet_size,
                gallon_size=invoice_line.gallon_size,
                unit_cost=invoice_line.rate,
                entry_date=invoice_line.invoice.invoice_date,
                supplier=f"SOLD TO {invoice_line.invoice.customer.name}",
                batch_number=f"INVOICE-{invoice_line.invoice.invoice_no}",
                notes=f"Sold to {invoice_line.invoice.customer.name} via Invoice {invoice_line.invoice.invoice_no}",
            )
            
            # Also create inventory transaction for backward compatibility
            # Check if inventory transaction already exists for this invoice
            existing_txn = InventoryTransaction.objects.filter(
                user=invoice_line.invoice.user,
                txn_type='SALE_TO_CUSTOMER',
                memo=f"Invoice {invoice_line.invoice.invoice_no} - {invoice_line.invoice.customer.name}"
            ).first()
            
            if not existing_txn:
                # Create new inventory transaction for the invoice
                existing_txn = InventoryTransaction.objects.create(
                    user=invoice_line.invoice.user,
                    txn_type='SALE_TO_CUSTOMER',
                    txn_date=invoice_line.invoice.invoice_date,
                    memo=f"Invoice {invoice_line.invoice.invoice_no} - {invoice_line.invoice.customer.name}",
                )
            
            # Create inventory transaction line
            InventoryTransactionLine.objects.create(
                inventory_transaction=existing_txn,
                item=invoice_line.item,
                qty=-invoice_line.qty,  # Negative for issue/sale
                unit_cost=invoice_line.rate,
                memo=f"Sold to {invoice_line.invoice.customer.name}",
            )
    
    def _create_customer_stock_for_line(self, invoice_line):
        """Create or update customer stock record for internal customers (ponds)"""
        from .models import CustomerStock
        
        # Only create customer stock for internal customers (ponds)
        if invoice_line.invoice.customer.type == 'internal_pond':
            # Get or create customer stock record
            customer_stock, created = CustomerStock.objects.get_or_create(
                user=invoice_line.invoice.user,
                customer=invoice_line.invoice.customer,
                item=invoice_line.item,
                defaults={
                    'pond': invoice_line.invoice.customer.pond,  # Link to the pond
                    'unit': invoice_line.unit,  # Use the invoice line's unit instead of hardcoded "pcs"
                    'unit_cost': invoice_line.rate,
                    'current_stock': 0,
                    'min_stock_level': 0,
                }
            )
            
            # Add the invoiced quantity to customer stock
            # Calculate effective quantity: if packet_size is provided, multiply qty by packet_size
            effective_qty = invoice_line.qty
            if invoice_line.packet_size and invoice_line.packet_size > 0:
                effective_qty = invoice_line.qty * invoice_line.packet_size
            
            customer_stock.add_stock(effective_qty, invoice_line.rate)


class CustomerPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for customer payment management"""
    queryset = CustomerPayment.objects.all()
    serializer_class = CustomerPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CustomerPayment.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        customer_payment = serializer.save(user=self.request.user)
        
        # Automatically apply payment to outstanding invoices
        self._apply_payment_to_invoices(customer_payment)
    
    def _apply_payment_to_invoices(self, customer_payment):
        """Automatically apply payment to outstanding invoices for the customer"""
        from .models import CustomerPaymentApply
        
        # Get outstanding invoices for this customer
        outstanding_invoices = Invoice.objects.filter(
            customer=customer_payment.customer,
            open_balance__gt=0
        ).order_by('invoice_date')  # Apply to oldest invoices first
        
        remaining_payment = customer_payment.amount_total
        
        for invoice in outstanding_invoices:
            if remaining_payment <= 0:
                break
                
            # Apply payment up to the invoice's outstanding balance
            amount_to_apply = min(remaining_payment, invoice.open_balance)
            
            # Create payment application record
            CustomerPaymentApply.objects.create(
                customer_payment=customer_payment,
                invoice=invoice,
                amount_applied=amount_to_apply
            )
            
            # Update invoice open balance
            invoice.open_balance -= amount_to_apply
            invoice.save(update_fields=['open_balance'])
            
            remaining_payment -= amount_to_apply
    
    def perform_destroy(self, instance):
        """Handle deletion of customer payment - reverse invoice balance updates"""
        from .models import CustomerPaymentApply
        
        # Get all payment applications for this payment
        payment_applies = CustomerPaymentApply.objects.filter(customer_payment=instance)
        
        for payment_apply in payment_applies:
            # Restore the invoice's open balance
            invoice = payment_apply.invoice
            invoice.open_balance += payment_apply.amount_applied
            invoice.save(update_fields=['open_balance'])
        
        # Delete the payment (this will cascade delete the payment applications)
        instance.delete()


class CustomerPaymentApplyViewSet(viewsets.ModelViewSet):
    """ViewSet for customer payment application management"""
    queryset = CustomerPaymentApply.objects.all()
    serializer_class = CustomerPaymentApplySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CustomerPaymentApply.objects.filter(customer_payment__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save()


class BillPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for bill payment management"""
    queryset = BillPayment.objects.all()
    serializer_class = BillPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return BillPayment.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        bill_payment = serializer.save(user=self.request.user)
        # If a specific bill is provided in request, create an apply record and update open_balance
        try:
            bill_id = self.request.data.get('bill_id') or self.request.data.get('bill')
            amount = self.request.data.get('total_amount') or self.request.data.get('amount_total')
            if bill_id and amount:
                from .models import Bill, BillPaymentApply
                bill = Bill.objects.filter(bill_id=bill_id, user=self.request.user).first()
                if bill:
                    amount_decimal = Decimal(str(amount))
                    apply_amount = min(amount_decimal, bill.open_balance)
                    BillPaymentApply.objects.create(
                        bill_payment=bill_payment,
                        bill=bill,
                        amount_applied=apply_amount
                    )
                    bill.open_balance = bill.open_balance - apply_amount
                    bill.save(update_fields=['open_balance'])
        except Exception:
            # Do not block payment creation on apply errors; they can be managed separately
            pass

    def perform_destroy(self, instance):
        # Reverse bill apply effects on deletion
        from .models import BillPaymentApply
        applies = BillPaymentApply.objects.filter(bill_payment=instance).select_related('bill')
        for ap in applies:
            bill = ap.bill
            bill.open_balance = bill.open_balance + ap.amount_applied
            bill.save(update_fields=['open_balance'])
        instance.delete()


class CustomerStockViewSet(viewsets.ModelViewSet):
    """ViewSet for customer stock management"""
    queryset = CustomerStock.objects.all()
    serializer_class = CustomerStockSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = CustomerStock.objects.filter(user=self.request.user)
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Filter by pond if provided
        pond_id = self.request.query_params.get('pond')
        if pond_id:
            queryset = queryset.filter(pond_id=pond_id)
        
        # Filter by item type if provided
        item_type = self.request.query_params.get('item_type')
        if item_type:
            queryset = queryset.filter(item__item_type=item_type)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DepositViewSet(viewsets.ModelViewSet):
    """ViewSet for deposit management"""
    queryset = Deposit.objects.all()
    serializer_class = DepositSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Deposit.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        deposit = serializer.save(user=self.request.user)
        
        # Handle customer payments if provided
        customer_payments = self.request.data.get('customer_payments', [])
        if customer_payments:
            self._create_deposit_lines(deposit, customer_payments)
    
    def _create_deposit_lines(self, deposit, customer_payment_ids):
        """Create deposit lines for selected customer payments with amount deduction logic"""
        from .models import DepositLine
        from decimal import Decimal
        
        # Get the specified deposit amount from request data
        specified_amount = self.request.data.get('total_amount')
        if specified_amount:
            specified_amount = Decimal(str(specified_amount))
        
        # Calculate total amount of selected customer payments
        selected_payments_total = Decimal('0')
        customer_payments = []
        
        for payment_id in customer_payment_ids:
            try:
                customer_payment = CustomerPayment.objects.get(
                    cust_payment_id=payment_id,
                    user=self.request.user
                )
                customer_payments.append(customer_payment)
                selected_payments_total += customer_payment.amount_total
                
            except CustomerPayment.DoesNotExist:
                continue
        
        if not customer_payments:
            return
        
        # Case 1: If deposit amount is specified, deduct from customer payments
        if specified_amount and specified_amount > 0:
            remaining_amount = specified_amount
            
            for customer_payment in customer_payments:
                if remaining_amount <= 0:
                    break
                
                # Calculate how much to deduct from this payment
                deduction_amount = min(remaining_amount, customer_payment.amount_total)
                
                # Create deposit line
                DepositLine.objects.create(
                    deposit=deposit,
                    customer_payment=customer_payment,
                    amount=deduction_amount
                )
                
                # Update customer payment amount (reduce by deduction)
                customer_payment.amount_total -= deduction_amount
                
                # If amount becomes 0 or less, delete the record
                if customer_payment.amount_total <= 0:
                    customer_payment.delete()
                else:
                    customer_payment.save(update_fields=['amount_total'])
                
                remaining_amount -= deduction_amount
            
            # Set deposit total to the specified amount
            deposit.total_amount = specified_amount
            
        # Case 2: If no deposit amount specified, use full amount and remove customer payments
        else:
            total_amount = Decimal('0')
            
            for customer_payment in customer_payments:
                # Create deposit line with full amount
                DepositLine.objects.create(
                    deposit=deposit,
                    customer_payment=customer_payment,
                    amount=customer_payment.amount_total
                )
                
                total_amount += customer_payment.amount_total
                
                # Delete the customer payment record (fully deposited)
                customer_payment.delete()
            
            # Set deposit total to sum of all customer payments
            deposit.total_amount = total_amount
        
        deposit.save(update_fields=['total_amount'])


class StockLevelViewSet(viewsets.ViewSet):
    """ViewSet for stock levels - calculated from inventory transactions"""
    queryset = Item.objects.none()  # Empty queryset since we calculate dynamically
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get current stock levels for all items"""
        from django.db.models import Sum, F
        from collections import defaultdict
        
        # Get pond filter from query parameters
        pond_id = request.query_params.get('pond_id')
        
        # Get all items that could have inventory (feeds, medicines, equipment, etc.)
        items = Item.objects.filter(user=request.user).exclude(item_type='service')
        
        print(f"DEBUG: Found {items.count()} inventory items for user {request.user.username}")
        if pond_id:
            print(f"DEBUG: Filtering by pond_id: {pond_id}")
        
        stock_levels = []
        
        for item in items:
            # Calculate current stock from inventory transactions
            stock_query = InventoryTransactionLine.objects.filter(
                inventory_transaction__user=request.user,
                item=item
            )
            
            # Filter by pond if specified
            if pond_id:
                stock_query = stock_query.filter(pond_id=pond_id)
            
            stock_data = stock_query.aggregate(
                current_stock=Sum('qty')
            )
            
            current_stock = stock_data['current_stock'] or 0
            
            # Determine status based on stock level
            if current_stock <= 0:
                status = 'out'
            elif current_stock <= 10:  # Assuming minimum stock of 10
                status = 'low'
            elif current_stock >= 100:  # Assuming maximum stock of 100
                status = 'high'
            else:
                status = 'normal'
            
            # Calculate total value (current_stock * unit_cost from latest transaction)
            latest_txn_query = InventoryTransactionLine.objects.filter(
                inventory_transaction__user=request.user,
                item=item
            )
            
            # Filter by pond if specified
            if pond_id:
                latest_txn_query = latest_txn_query.filter(pond_id=pond_id)
            
            latest_txn = latest_txn_query.order_by('-inventory_transaction__txn_date').first()
            
            unit_cost = latest_txn.unit_cost if latest_txn else 0
            total_value = current_stock * unit_cost
            
            stock_levels.append({
                'item_id': item.item_id,
                'item_name': item.name,
                'item_type': item.item_type,
                'current_stock': current_stock,
                'minimum_stock': 10,  # Default minimum
                'maximum_stock': 100,  # Default maximum
                'unit_cost': unit_cost,
                'total_value': total_value,
                'status': status,
            })
        
        print(f"DEBUG: Returning {len(stock_levels)} stock levels")
        return Response(stock_levels)