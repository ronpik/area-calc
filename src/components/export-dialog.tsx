"use client";

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { TrackedPoint } from '@/app/page';
import { useToast } from '@/hooks/use-toast';
import { loadRubikFont } from '@/fonts/Rubik-normal';

export interface KeyValue {
  id: number;
  key: string;
  value: string;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: number;
  points: TrackedPoint[];
}

export function ExportDialog({ open, onOpenChange, area, points }: ExportDialogProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [keyValues, setKeyValues] = useState<KeyValue[]>([
    { id: 1, key: 'זן', value: '' },
    { id: 2, key: 'מספר שתילים', value: '' }
  ]);
  const [includeCoordinates, setIncludeCoordinates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      loadRubikFont();
      console.log('Hebrew font loaded successfully');
    } catch (error) {
      console.error('Error loading Hebrew font:', error);
      toast({
        variant: 'destructive',
        title: 'Font Loading Error',
        description: 'Could not load Hebrew font. Text may not display correctly.',
      });
    }
  }, [toast]);

  const addKeyValue = () => {
    setKeyValues([...keyValues, { id: Date.now(), key: '', value: '' }]);
  };

  const removeKeyValue = (id: number) => {
    setKeyValues(keyValues.filter(kv => kv.id !== id));
  };

  const updateKeyValue = (id: number, field: 'key' | 'value', text: string) => {
    setKeyValues(keyValues.map(kv => (kv.id === id ? { ...kv, [field]: text } : kv)));
  };

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      onOpenChange(false);
      await new Promise(resolve => setTimeout(resolve, 300));

      const mapElement = document.querySelector<HTMLElement>('.leaflet-container');
      if (!mapElement) {
        throw new Error("Map element not found");
      }

      const map = (window as any).leafletMap;
      if (!map) {
        throw new Error("Map instance not found");
      }

      // Store original state for restoration
      const originalCenter = map.getCenter();
      const originalZoom = map.getZoom();
      const originalWidth = mapElement.style.width;
      const originalHeight = mapElement.style.height;
      const originalTransform = mapElement.style.transform;

      // Set standardized dimensions for consistent capture (4:3 aspect ratio)
      const captureWidth = 1200; // px
      const captureHeight = 900; // px

      mapElement.style.width = `${captureWidth}px`;
      mapElement.style.height = `${captureHeight}px`;
      mapElement.style.transform = 'none';

      // Force Leaflet to recalculate and redraw
      map.invalidateSize();

      // Fit map bounds to show all tracked points
      if (points.length >= 3) {
        // Use Leaflet's bounds API for accurate bounds calculation
        const latLngs = points.map(p => [p.point.lat, p.point.lng]);
        const bounds = (window as any).L.latLngBounds(latLngs);

        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 18,        // Prevent excessive zoom for small areas
          animate: false      // No animation during export
        });
      } else if (points.length > 0) {
        // Handle case with points but not enough for a polygon
        const latLngs = points.map(p => [p.point.lat, p.point.lng]);
        const bounds = (window as any).L.latLngBounds(latLngs);

        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 18,
          animate: false
        });
      }

      // Wait for map to redraw completely with extra invalidation
      await new Promise(resolve => setTimeout(resolve, 800));
      map.invalidateSize({ pan: false });

                               // Hide Leaflet's polygon before capture to prevent duplication
      // We'll manually draw it with accurate coordinates instead
      const polygonPane = mapElement.querySelector('.leaflet-overlay-pane');
      const originalPolygonDisplay = polygonPane ? (polygonPane as HTMLElement).style.display : '';
      if (polygonPane) {
        (polygonPane as HTMLElement).style.display = 'none';
      }

      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1, // Use scale 1 since we're already at desired resolution
        width: captureWidth,
        height: captureHeight,
      });

      // Restore polygon visibility
      if (polygonPane) {
        (polygonPane as HTMLElement).style.display = originalPolygonDisplay;
      }

      // Manually draw the polygon using Leaflet's accurate coordinate projection
      if (points.length > 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Use Leaflet's latLngToContainerPoint for pixel-perfect accuracy
          const pixelPoints = points.map(p => {
            const point = map.latLngToContainerPoint([p.point.lat, p.point.lng]);
            return { x: point.x, y: point.y };
          });

          // Get the primary color from CSS variables
          const primaryColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary')
            .trim();

          // Convert HSL values to RGB (format is typically "222.2 47.4% 11.2%")
          const hslMatch = primaryColor.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
          let fillColor = 'rgba(59, 130, 246, 0.3)'; // fallback blue
          let strokeColor = 'rgb(59, 130, 246)';

          if (hslMatch) {
            const h = parseFloat(hslMatch[1]);
            const s = parseFloat(hslMatch[2]) / 100;
            const l = parseFloat(hslMatch[3]) / 100;

            // Convert HSL to RGB
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
            const m = l - c / 2;

            let r = 0, g = 0, b = 0;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }

            const red = Math.round((r + m) * 255);
            const green = Math.round((g + m) * 255);
            const blue = Math.round((b + m) * 255);

            fillColor = `rgba(${red}, ${green}, ${blue}, 0.3)`;
            strokeColor = `rgb(${red}, ${green}, ${blue})`;
          }

          // Draw the polygon with accurate coordinates
          ctx.beginPath();
          ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);
          for (let i = 1; i < pixelPoints.length; i++) {
            ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
          }
          ctx.closePath();

          // Fill with semi-transparent color
          ctx.fillStyle = fillColor;
          ctx.fill();

          // Draw border
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Restore original dimensions and view immediately after capture
      mapElement.style.width = originalWidth;
      mapElement.style.height = originalHeight;
      mapElement.style.transform = originalTransform;

      // Restore original map view
      map.setView(originalCenter, originalZoom, { animate: false });
      map.invalidateSize();

      const mapImageData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont('Rubik', 'normal');
      doc.setR2L(true);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = margin;

      // doc.setFontSize(22);
      doc.text(title || 'דו״ח מדידת שטח', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      const creationDate = new Date().toLocaleDateString('he-IL', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`נוצר ב: ${creationDate}`, pageWidth / 2, currentY, { align: 'center' });
      doc.setTextColor(0);
      currentY += 12;

      if (points.length >= 3) {
        doc.setFontSize(14);
        doc.text(`שטח כולל: ${area.toFixed(2)} מ"ר`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 10;

        // // Temporarily disable RTL for numeric display (numbers don't render correctly in RTL mode)
        // doc.setR2L(false);
        // // Re-enable RTL and restore font
        // doc.setR2L(true);
      }

      // Use fixed 4:3 aspect ratio to match capture dimensions
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (imgWidth * 3) / 4; // Maintain 4:3 aspect ratio
      doc.addImage(mapImageData, 'PNG', margin, currentY, imgWidth, imgHeight);

      // Draw North Arrow
      const arrowBaseX = pageWidth - margin - 8;
      const arrowBaseY = currentY + 15;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(arrowBaseX, arrowBaseY, arrowBaseX, arrowBaseY - 10);
      doc.triangle(
        arrowBaseX, arrowBaseY - 12,
        arrowBaseX - 2, arrowBaseY - 8,
        arrowBaseX + 2, arrowBaseY - 8,
        'F'
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('N', arrowBaseX, arrowBaseY + 3, { align: 'center' });
      doc.setFont('Rubik', 'normal');


      currentY += imgHeight + 15;

      const checkPageBreak = (heightNeeded: number) => {
        if (currentY + heightNeeded > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      };

      if (points.length > 0) {
        checkPageBreak(20);
        doc.setFontSize(16);
        doc.text('סיכום', pageWidth - margin, currentY, { align: 'right' });
        currentY += 8;
        doc.setFontSize(12);
        doc.text(`סה"כ נקודות: ${points.length}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 15;
      }

      const filteredKeyValues = keyValues.filter(kv => kv.key.trim() !== '' && kv.value.trim() !== '');
      if (filteredKeyValues.length > 0) {
        checkPageBreak(20 + filteredKeyValues.length * 6);
        doc.setFontSize(16);
        doc.text('פרטים', pageWidth - margin, currentY, { align: 'right' });
        currentY += 8;
        doc.setFontSize(12);
        filteredKeyValues.forEach(kv => {
          checkPageBreak(6);
          doc.text(`${kv.key}: ${kv.value}`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 6;
        });
        currentY += 9;
      }

      if (notes.trim() !== '') {
        checkPageBreak(20);
        doc.setFontSize(16);
        doc.text('הערות', pageWidth - margin, currentY, { align: 'right' });
        currentY += 8;
        doc.setFontSize(12);
        const splitNotes = doc.splitTextToSize(notes, pageWidth - margin * 2);
        checkPageBreak(splitNotes.length * 6);
        splitNotes.forEach((line: string) => {
          checkPageBreak(6);
          doc.text(line, pageWidth - margin, currentY, { align: 'right' });
          currentY += 6;
        });
        currentY += 3;
      }

      if (includeCoordinates && points.length > 0) {
        checkPageBreak(20);
        doc.setR2L(false); // Disable RTL for coordinates
        doc.setFont('helvetica', 'normal'); // Switch to default font for English
        doc.setFontSize(16);
        doc.text('Recorded Coordinates', margin, currentY);
        currentY += 8;
        doc.setFontSize(10);
        points.forEach((p, index) => {
          checkPageBreak(5);
          const line = `${index + 1}. Lat: ${p.point.lat.toFixed(6)}, Lng: ${p.point.lng.toFixed(6)} (${p.type})`;
          doc.text(line, margin, currentY);
          currentY += 5;
        });
      }

      // Open PDF in new tab
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      toast({
        title: 'PDF נפתח בכרטיסייה חדשה',
        description: 'הדוח שלך נפתח בכרטיסייה חדשה.',
      });

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: 'destructive',
        title: 'יצוא נכשל',
        description: error instanceof Error ? error.message : 'לא ניתן ליצור PDF. נסה שוב.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>יצוא ל-PDF</DialogTitle>
          <DialogDescription>הגדר את הפרטים עבור הדוח שלך.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">כותרת הדוח</Label>
            <Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="לדוגמה: סקר חווה ג'ונסון" />
          </div>

          <div className="space-y-2">
            <Label>הערות מפתח-ערך</Label>
            <div className="space-y-2">
              {keyValues.map((kv, index) => (
                <div key={kv.id} className="flex items-center gap-2">
                  <Input
                    placeholder="מפתח (לדוגמה: סוג אדמה)"
                    value={kv.key}
                    onChange={(e) => updateKeyValue(kv.id, 'key', e.target.value)}
                  />
                  <Input
                    placeholder={index === 0 ? 'לדוגמה: ״גן עדן״' : index === 1 ? 'לדוגמה: 10' : 'ערך'}
                    value={kv.value}
                    onChange={(e) => updateKeyValue(kv.id, 'value', e.target.value)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeKeyValue(kv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addKeyValue} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> הוסף זוג
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="free-notes">הערות נוספות</Label>
            <Textarea id="free-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הזן מידע רלוונטי נוסף כאן..." />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="include-coords" checked={includeCoordinates} onCheckedChange={(checked) => setIncludeCoordinates(!!checked)} />
            <label
              htmlFor="include-coords"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              כלול רשימת קואורדינטות בדוח
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>ביטול</Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isGenerating ? 'מייצר...' : 'יצוא'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
