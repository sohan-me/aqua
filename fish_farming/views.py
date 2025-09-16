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
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice, SurvivalRate
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
    FishSamplingSerializer, FeedingAdviceSerializer, SurvivalRateSerializer
)


class PondViewSet(viewsets.ModelViewSet):
    """ViewSet for pond management"""
    queryset = Pond.objects.all()
    serializer_class = PondSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Pond.objects.filter(user=self.request.user)
    
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
    """ViewSet for fish species"""
    queryset = Species.objects.all()
    serializer_class = SpeciesSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


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
        return SampleType.objects.filter(is_active=True)


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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class IncomeTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for income types"""
    queryset = IncomeType.objects.all()
    serializer_class = IncomeTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


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
        return Alert.objects.filter(pond__user=self.request.user)
    
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
                    
                    # Store for detailed breakdown
                    key = f"{pond.name} - {species.name if species else 'Mixed'}"
                    pond_species_biomass[key] = {
                        'initial_biomass': initial_biomass,
                        'growth_biomass': cumulative_biomass_change,
                        'current_biomass': current_biomass
                    }
            
            return Response({
                'summary': {
                    'total_biomass_gain_kg': total_biomass_gain,
                    'total_biomass_loss_kg': total_biomass_loss,
                    'net_biomass_change_kg': net_biomass_change,
                    'total_current_biomass_kg': total_current_biomass,
                    'total_samplings': samplings.count(),
                    'samplings_with_biomass_data': len(biomass_changes)
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
                
                # Get first and last sampling
                first_sampling = combo_samplings.first()
                last_sampling = combo_samplings.last()
                
                # Calculate weight gain
                initial_weight = float(first_sampling.average_weight_kg)
                final_weight = float(last_sampling.average_weight_kg)
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
                if not estimated_fish_count and first_sampling.fish_per_kg:
                    # This is a rough estimate - use the fish_per_kg from sampling
                    # and assume a reasonable total biomass
                    estimated_fish_count = float(first_sampling.fish_per_kg) * 100  # Assume 100kg total biomass as fallback
                
                total_weight_gain_kg = round(estimated_fish_count * weight_gain_per_fish, 4)
                
                # Calculate FCR with 4 decimal places
                fcr = round(total_feed_kg / total_weight_gain_kg, 4) if total_weight_gain_kg > 0 else 0
                
                # Calculate days
                days = (last_sampling.date - first_sampling.date).days
                
                # Calculate average daily feed with 4 decimal places
                avg_daily_feed = round(total_feed_kg / days, 4) if days > 0 else 0
                
                # Calculate average daily weight gain with 4 decimal places
                avg_daily_weight_gain = round(total_weight_gain_kg / days, 4) if days > 0 else 0
                
                fcr_data.append({
                    'pond_id': pond_id,
                    'pond_name': pond.name,
                    'species_id': species_id,
                    'species_name': species.name,
                    'start_date': first_sampling.date.isoformat(),
                    'end_date': last_sampling.date.isoformat(),
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
                # Check if species has fish sampling data
                has_sampling = FishSampling.objects.filter(
                    pond=pond, species=species
                ).exists()
                
                if not has_sampling:
                    species_without_sampling.append(species.name)
                    continue
                
                # Use the existing generate_advice logic but with species parameter
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
            if species_without_sampling:
                error_message += f"Please add fish sampling data for: {', '.join(species_without_sampling)}. "
            if failed_species:
                error_message += f"Additional issues: {', '.join(failed_species)}."
            
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
                'species_without_sampling': species_without_sampling,
                'failed_species': failed_species
            }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def _generate_advice_for_species(self, pond, species, request):
        """Comprehensive feeding advice generation based on all available data"""
        from django.db.models import Sum, Avg, Count, Max, Min
        from datetime import timedelta
        
        # 1. Get latest fish sampling data
        latest_sampling = FishSampling.objects.filter(
            pond=pond, species=species
        ).order_by('-date').first()
        
        if not latest_sampling:
            return None
        
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
        
        # 8. Calculate comprehensive feeding recommendations
        feeding_recommendations = self._calculate_feeding_recommendations(
            estimated_fish_count,
            latest_sampling,
            water_quality_analysis,
            mortality_analysis,
            feeding_analysis,
            environmental_analysis,
            growth_analysis
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
            'notes': self._generate_comprehensive_notes(
                pond, species, fish_count_analysis, water_quality_analysis,
                mortality_analysis, feeding_analysis, environmental_analysis,
                growth_analysis, feeding_recommendations
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
                'feeding_recommendations': feeding_recommendations
            }
        })
        
        return advice_data
    
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
                amounts = [feed['daily_total'] for feed in daily_feeds if feed['daily_total']]
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
    
    def _calculate_feeding_recommendations(self, fish_count, latest_sampling, water_quality, 
                                         mortality, feeding, environmental, growth):
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
                                    mortality, feeding, environmental, growth, recommendations):
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
            f"Total adjustment: {recommendations['adjustments']['total_adjustment']:+.0f}%",
        ]
        
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