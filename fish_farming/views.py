from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Pond, Species, Stocking, DailyLog, FeedType, Feed, SampleType, Sampling, 
    Mortality, Harvest, ExpenseType, IncomeType, Expense, Income,
    InventoryFeed, Treatment, Alert, Setting, FeedingBand, 
    EnvAdjustment, KPIDashboard, FishSampling, FeedingAdvice
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
    FishSamplingSerializer, FeedingAdviceSerializer
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
        return Stocking.objects.filter(pond__user=self.request.user)
    
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
        return Mortality.objects.filter(pond__user=self.request.user)
    
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
        return Harvest.objects.filter(pond__user=self.request.user)
    
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
        return FishSampling.objects.filter(pond__user=self.request.user)
    
    def perform_create(self, serializer):
        pond_id = self.request.data.get('pond')
        pond = get_object_or_404(Pond, id=pond_id, user=self.request.user)
        serializer.save(pond=pond, user=self.request.user)


class FeedingAdviceViewSet(viewsets.ModelViewSet):
    """ViewSet for feeding advice"""
    queryset = FeedingAdvice.objects.all()
    serializer_class = FeedingAdviceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FeedingAdvice.objects.filter(pond__user=self.request.user)
    
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