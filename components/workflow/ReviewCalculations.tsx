"use client";

import React, { useState, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Calculator,
  DollarSign,
  FileText,
  Home,
  Palette,
  Clock,
  Ruler,
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  CheckCircle,
  Expand,
  Settings,
  RefreshCw,
  Info,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FloatingInput } from "@/components/ui/FloatingInput";
import {
  SliderButton,
  SliderButtonPresets,
} from "@/components/ui/SliderButton";
import { PricingModalEnhanced as PricingModal } from "@/components/ui/PricingModalEnhanced";
import { PricingBreakdown } from "@/components/ui/PricingBreakdown";
import { cn } from "@/lib/utils";
import { useEstimateStore } from "@/stores/useEstimateStore";

interface ReviewCalculationsProps {
  onNext: () => void;
  onPrevious: () => void;
}

interface PricingAdjustment {
  reason: string;
  percentage: number;
  amount: number;
}

export const ReviewCalculations: React.FC<ReviewCalculationsProps> = ({
  onNext,
  onPrevious,
}) => {
  const store = useEstimateStore();
  const { estimate, markStepCompleted, setCalculations } = store;

  const [selectedTier, setSelectedTier] = useState<"good" | "better" | "best">(
    "better",
  );
  const [adjustments, setAdjustments] = useState<PricingAdjustment[]>([]);
  const [customNotes, setCustomNotes] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  const fadeIn = useSpring({
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: { tension: 200, friction: 20 },
  });

  // Calculate totals from measurements
  const exteriorTotal =
    estimate.exteriorMeasurements?.reduce(
      (total, m) => total + (m.sqft || m.width * m.height),
      0,
    ) || 0;

  const interiorTotal =
    estimate.interiorMeasurements?.reduce((total, m) => {
      const wallSqft = Object.values(m.walls || {}).reduce(
        (sum: number, wall: any) => sum + (wall?.sqft || 0),
        0,
      );
      const ceilingSqft = m.ceiling?.sqft || 0;
      return total + wallSqft + ceilingSqft;
    }, 0) || 0;

  const interiorTrimTotal =
    estimate.interiorMeasurements?.reduce((total, m) => {
      return (
        total +
        (m.trim || []).reduce(
          (sum: number, trim: any) => sum + (trim?.linearFeet || 0),
          0,
        )
      );
    }, 0) || 0;

  const totalSqft = exteriorTotal + interiorTotal;
  const totalTrimLf = interiorTrimTotal;

  // Mock calculation if not available
  const calculation = estimate.calculations || {
    laborHours: Math.ceil(totalSqft / 180) + Math.ceil(totalTrimLf / 100),
    laborCost: (Math.ceil(totalSqft / 180) + Math.ceil(totalTrimLf / 100)) * 65,
    materialCost:
      Math.ceil((totalSqft / 400) * 2) * 48 +
      Math.ceil(totalSqft / 350) * 38 +
      totalSqft * 0.12,
    subtotal: 0,
    overhead: 0,
    profit: 0,
    total: 0,
    breakdown: [],
    pricing: {
      good: Math.round(
        ((Math.ceil(totalSqft / 180) + Math.ceil(totalTrimLf / 100)) * 65 +
          (Math.ceil((totalSqft / 400) * 2) * 48 +
            Math.ceil(totalSqft / 350) * 38 +
            totalSqft * 0.12)) *
          1.3,
      ),
      better: Math.round(
        ((Math.ceil(totalSqft / 180) + Math.ceil(totalTrimLf / 100)) * 65 +
          (Math.ceil((totalSqft / 400) * 2) * 48 +
            Math.ceil(totalSqft / 350) * 38 +
            totalSqft * 0.12)) *
          1.4,
      ),
      best: Math.round(
        ((Math.ceil(totalSqft / 180) + Math.ceil(totalTrimLf / 100)) * 65 +
          (Math.ceil((totalSqft / 400) * 2) * 48 +
            Math.ceil(totalSqft / 350) * 38 +
            totalSqft * 0.12)) *
          1.5,
      ),
    },
  };

  const selectedPrice = calculation.pricing?.[selectedTier] || 0;
  const adjustedPrice = adjustments.reduce(
    (total, adj) => total + adj.amount,
    selectedPrice,
  );

  const addAdjustment = () => {
    setAdjustments([
      ...adjustments,
      {
        reason: "",
        percentage: 0,
        amount: 0,
      },
    ]);
  };

  const updateAdjustment = (
    index: number,
    field: keyof PricingAdjustment,
    value: any,
  ) => {
    const updated = adjustments.map((adj, i) => {
      if (i === index) {
        const newAdj = { ...adj, [field]: value };
        // Auto-calculate amount when percentage changes
        if (field === "percentage") {
          newAdj.amount = Math.round(selectedPrice * (value / 100));
        }
        return newAdj;
      }
      return adj;
    });
    setAdjustments(updated);
  };

  const removeAdjustment = (index: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    // Simulate recalculation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRecalculating(false);
  };

  const handleSaveAndContinue = () => {
    // Update final calculations with selected tier and adjustments
    const finalCalculation = {
      ...calculation,
      selectedTier,
      adjustments,
      finalPrice: adjustedPrice,
      customNotes,
      total: adjustedPrice,
    };

    setCalculations(finalCalculation);
    markStepCompleted("review-calculations");
    onNext();
  };

  const canProceed = totalSqft > 0 || totalTrimLf > 0;

  return (
    <animated.div style={fadeIn}>
      <h2 className="text-2xl font-semibold mb-6">
        Review & Final Calculations
      </h2>
      <p className="text-paintbox-text-muted mb-8">
        Review all measurements, select pricing tier, and make final adjustments
        before generating the estimate.
      </p>

      {/* Project Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Project Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <Home className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Exterior</p>
              <p className="text-xl font-bold text-blue-900">
                {exteriorTotal.toFixed(0)} sq ft
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-green-50 rounded-lg p-4">
              <Expand className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Interior</p>
              <p className="text-xl font-bold text-green-900">
                {interiorTotal.toFixed(0)} sq ft
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-purple-50 rounded-lg p-4">
              <Ruler className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Trim Work</p>
              <p className="text-xl font-bold text-purple-900">
                {totalTrimLf.toFixed(0)} ft
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-orange-50 rounded-lg p-4">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Est. Hours</p>
              <p className="text-xl font-bold text-orange-900">
                {calculation.laborHours}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Select Pricing Tier
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={cn("w-4 h-4", isRecalculating && "animate-spin")}
            />
            Recalculate
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Good Tier */}
          <div
            className={cn(
              "border rounded-lg p-6 transition-all relative",
              selectedTier === "good"
                ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                : "border-gray-200 hover:border-green-300",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Good</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier("good");
                    setShowPricingModal(true);
                  }}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-green-600"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                Emerald
              </span>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setSelectedTier("good")}
            >
              <p className="text-3xl font-bold text-green-600 mb-4">
                ${calculation.pricing?.good?.toLocaleString() || "0"}
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Sherwin-Williams Emerald</li>
                <li>• Standard prep work</li>
                <li>• 3-year warranty</li>
                <li>• 56% margin (competitive)</li>
              </ul>
            </div>
            {selectedTier === "good" && (
              <div className="mt-3 flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </div>

          {/* Better Tier */}
          <div
            className={cn(
              "border rounded-lg p-6 transition-all relative",
              selectedTier === "better"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-blue-300",
            )}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              RECOMMENDED
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Better</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier("better");
                    setShowPricingModal(true);
                  }}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-blue-600"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Rain Refresh
              </span>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setSelectedTier("better")}
            >
              <p className="text-3xl font-bold text-blue-600 mb-4">
                ${calculation.pricing?.better?.toLocaleString() || "0"}
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• SW Rain Refresh Premium</li>
                <li>• Enhanced prep work</li>
                <li>• 5-year warranty</li>
                <li>• 58% margin (optimal)</li>
              </ul>
            </div>
            {selectedTier === "better" && (
              <div className="mt-3 flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </div>

          {/* Best Tier */}
          <div
            className={cn(
              "border rounded-lg p-6 transition-all",
              selectedTier === "best"
                ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                : "border-gray-200 hover:border-purple-300",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">Best</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier("best");
                    setShowPricingModal(true);
                  }}
                  className="p-1 h-6 w-6 text-gray-400 hover:text-purple-600"
                >
                  <Info className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                Aura
              </span>
            </div>
            <div
              className="cursor-pointer"
              onClick={() => setSelectedTier("best")}
            >
              <p className="text-3xl font-bold text-purple-600 mb-4">
                ${calculation.pricing?.best?.toLocaleString() || "0"}
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Benjamin Moore Aura</li>
                <li>• Premium restoration</li>
                <li>• 7-year warranty</li>
                <li>• 62% margin (premium)</li>
              </ul>
            </div>
            {selectedTier === "best" && (
              <div className="mt-3 flex items-center gap-2 text-purple-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Transparency Section */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {showDetailedBreakdown ? "Hide" : "Show"} Detailed Cost Breakdown
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Detailed Pricing Breakdown */}
      {showDetailedBreakdown && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Detailed Cost Breakdown
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open("/docs/PRICING_METHODOLOGY.md", "_blank")
              }
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View Full Methodology
            </Button>
          </div>

          <PricingBreakdown
            tier={selectedTier}
            breakdown={{
              exteriorSqft: exteriorTotal,
              interiorSqft: interiorTotal,
              totalSqft: totalSqft,
              paintGallons: Math.ceil((totalSqft * 0.8) / 375),
              primerGallons: Math.ceil((totalSqft * 0.2) / 375),
              paintCost:
                Math.ceil((totalSqft * 0.8) / 375) *
                (selectedTier === "good"
                  ? 50
                  : selectedTier === "better"
                    ? 57.5
                    : 70),
              primerCost: Math.ceil((totalSqft * 0.2) / 375) * 35,
              suppliesCost: totalSqft * 0.15,
              totalMaterialCost: calculation.materialCost || 0,
              prepHours: Math.ceil(calculation.laborHours * 0.3),
              paintingHours: Math.ceil(calculation.laborHours * 0.6),
              detailHours: Math.ceil(calculation.laborHours * 0.1),
              totalLaborHours: calculation.laborHours || 0,
              laborRate: 65,
              totalLaborCost: calculation.laborCost || 0,
              subtotal:
                (calculation.materialCost || 0) + (calculation.laborCost || 0),
              overheadPercent: 15,
              overheadAmount:
                ((calculation.materialCost || 0) +
                  (calculation.laborCost || 0)) *
                0.15,
              profitPercent:
                selectedTier === "good"
                  ? 41
                  : selectedTier === "better"
                    ? 43
                    : 47,
              profitAmount:
                ((calculation.materialCost || 0) +
                  (calculation.laborCost || 0)) *
                (selectedTier === "good"
                  ? 0.41
                  : selectedTier === "better"
                    ? 0.43
                    : 0.47),
              preDiscountTotal:
                ((calculation.materialCost || 0) +
                  (calculation.laborCost || 0)) *
                (selectedTier === "good"
                  ? 1.56
                  : selectedTier === "better"
                    ? 1.58
                    : 1.62),
              discountPercent: 20,
              discountAmount:
                ((calculation.materialCost || 0) +
                  (calculation.laborCost || 0)) *
                (selectedTier === "good"
                  ? 1.56
                  : selectedTier === "better"
                    ? 1.58
                    : 1.62) *
                0.2,
              finalTotal: calculation.pricing?.[selectedTier] || 0,
              accessDifficulty: "standard",
              accessAdjustment: 0,
              surfaceCondition: "good",
              conditionAdjustment: 5,
            }}
            showDetailed={true}
          />
        </div>
      )}

      {/* Price Adjustments */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Price Adjustments
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdjustments(!showAdjustments)}
          >
            {showAdjustments ? "Hide" : "Show"} Adjustments
          </Button>
        </div>

        {showAdjustments && (
          <div className="space-y-4">
            {adjustments.map((adjustment, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <FloatingInput
                  label="Reason"
                  value={adjustment.reason}
                  onChange={(e) =>
                    updateAdjustment(index, "reason", e.target.value)
                  }
                  placeholder="e.g., Difficult access, Extra prep work"
                  className="flex-1"
                />
                <FloatingInput
                  label="Percentage"
                  type="number"
                  value={adjustment.percentage}
                  onChange={(e) =>
                    updateAdjustment(
                      index,
                      "percentage",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  placeholder="0"
                  className="w-24"
                />
                <div className="w-32">
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-lg font-semibold">
                    {adjustment.amount >= 0 ? "+" : ""}$
                    {adjustment.amount.toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAdjustment(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={addAdjustment}
              className="w-full"
            >
              Add Adjustment
            </Button>
          </div>
        )}

        {/* Final Price Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Base Price ({selectedTier})
              </p>
              <p className="text-xl font-semibold">
                ${selectedPrice.toLocaleString()}
              </p>
            </div>
            {adjustments.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Adjustments</p>
                <p className="text-lg font-semibold text-blue-600">
                  {adjustments.reduce((sum, adj) => sum + adj.amount, 0) >= 0
                    ? "+"
                    : ""}
                  $
                  {adjustments
                    .reduce((sum, adj) => sum + adj.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-600">Final Price</p>
              <p className="text-3xl font-bold text-green-600">
                ${adjustedPrice.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Notes */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Custom Notes
        </h3>
        <FloatingInput
          label="Additional notes for the estimate"
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Any special considerations, timeline notes, or client requests..."
          multiline
          rows={3}
        />
      </div>

      {/* Warning if no measurements */}
      {!canProceed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              No measurements found
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Please go back and add measurements for exterior or interior
              surfaces before proceeding.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t border-paintbox-border">
        <Button onClick={onPrevious} variant="secondary">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Interior
        </Button>

        <div className="flex gap-4">
          <SliderButtonPresets.SubmitEstimate
            onComplete={handleSaveAndContinue}
            text="Slide to finalize calculations"
            completeText="Finalized!"
            disabled={!canProceed}
          />
        </div>
      </div>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        tier={selectedTier}
        projectDetails={{
          exteriorSqft: exteriorTotal,
          interiorSqft: interiorTotal,
          totalSqft: totalSqft,
          laborHours: calculation.laborHours || 0,
        }}
        pricing={{
          materialCost: calculation.materialCost || 0,
          laborCost: calculation.laborCost || 0,
          subtotal:
            (calculation.materialCost || 0) + (calculation.laborCost || 0),
          margin:
            (calculation.pricing?.[selectedTier] || 0) -
            ((calculation.materialCost || 0) + (calculation.laborCost || 0)),
          finalPrice: calculation.pricing?.[selectedTier] || 0,
        }}
      />
    </animated.div>
  );
};
