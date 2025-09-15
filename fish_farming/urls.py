from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'ponds', views.PondViewSet)
router.register(r'species', views.SpeciesViewSet)
router.register(r'stocking', views.StockingViewSet)
router.register(r'daily-logs', views.DailyLogViewSet)
router.register(r'feed-types', views.FeedTypeViewSet)
router.register(r'feeds', views.FeedViewSet)
router.register(r'sample-types', views.SampleTypeViewSet)
router.register(r'sampling', views.SamplingViewSet)
router.register(r'mortality', views.MortalityViewSet)
router.register(r'harvests', views.HarvestViewSet)
router.register(r'expense-types', views.ExpenseTypeViewSet)
router.register(r'income-types', views.IncomeTypeViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'incomes', views.IncomeViewSet)
router.register(r'inventory-feed', views.InventoryFeedViewSet)
router.register(r'treatments', views.TreatmentViewSet)
router.register(r'alerts', views.AlertViewSet)
router.register(r'settings', views.SettingViewSet)
router.register(r'feeding-bands', views.FeedingBandViewSet)
router.register(r'env-adjustments', views.EnvAdjustmentViewSet)
router.register(r'kpi-dashboard', views.KPIDashboardViewSet)
router.register(r'fish-sampling', views.FishSamplingViewSet)
router.register(r'feeding-advice', views.FeedingAdviceViewSet)
router.register(r'survival-rates', views.SurvivalRateViewSet)
router.register(r'target-biomass', views.TargetBiomassViewSet, basename='target-biomass')

urlpatterns = [
    path('', include(router.urls)),
]
