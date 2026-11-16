import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircuitBoard,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Fan,
  Gauge,
  HardDrive,
  Info,
  MemoryStick,
  Monitor,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { assembleBuildFromIds, formatTry } from '../data/builds';
import { getMergedCatalogParts } from '../data/catalogAdapter';
import {
  BasePartSpec,
  BuilderPreferences,
  CasePart,
  CoolerPart,
  CpuPart,
  GpuPart,
  MotherboardPart,
  PartCategoryKey,
  PcBuild,
  PricingCatalogResponse,
  PsuPart,
  RamPart,
  SelectedPartIds,
  SsdPart,
} from '../types/pc';
import { evaluateCompatibility } from '../utils/compatibility';
import { ProductImage } from './ProductImage';

interface PCBuilderProps {
  preferences: BuilderPreferences;
  selectedIds: Partial<SelectedPartIds>;
  pricingCatalog: PricingCatalogResponse | null;
  pricingError: string | null;
  initialStepField?: keyof SelectedPartIds | null;
  onRetryPricing: () => void;
  onChangeSelectedIds: (next: Partial<SelectedPartIds>) => void;
  onResetAll: () => void;
  onInspectBuild: (build: PcBuild) => void;
  onInspectPart: (category: PartCategoryKey, partId: string) => void;
  onOpenAdvisor?: () => void;
}

type BuilderSlotConfig = {
  field: keyof SelectedPartIds;
  category: PartCategoryKey;
  title: string;
  selectLabel: string;
  description: string;
  renderIcon: (className?: string) => ReactNode;
  items: BasePartSpec[];
};

type BuilderSlotMeta = Omit<BuilderSlotConfig, 'items'>;

const BUILDER_SLOT_META: BuilderSlotMeta[] = [
  {
    field: 'cpuId',
    category: 'cpu',
    title: 'İşlemci (CPU)',
    selectLabel: '+ İşlemci Seç',
    description: 'Seçeceğiniz işlemcinin soketi anakart ve soğutucu listesini otomatik filtreler.',
    renderIcon: (cls = 'h-5 w-5') => <Cpu className={cls} />,
  },
  {
    field: 'motherboardId',
    category: 'motherboard',
    title: 'Anakart',
    selectLabel: '+ Anakart Seç',
    description: 'İşlemci soketiyle birebir uyumlu anakartlar listelenir ve DDR tipini belirler.',
    renderIcon: (cls = 'h-5 w-5') => <CircuitBoard className={cls} />,
  },
  {
    field: 'ramId',
    category: 'ram',
    title: 'RAM Bellek',
    selectLabel: '+ RAM Seç',
    description: 'Seçilen anakartın desteklediği DDR4 veya DDR5 bellek modülleri otomatik süzülür.',
    renderIcon: (cls = 'h-5 w-5') => <MemoryStick className={cls} />,
  },
  {
    field: 'gpuId',
    category: 'gpu',
    title: 'Ekran Kartı (GPU)',
    selectLabel: '+ Ekran Kartı Seç',
    description: 'Oyun ve render performansını belirler; güç ve kasa uzunluğu kontrol edilir.',
    renderIcon: (cls = 'h-5 w-5') => <Monitor className={cls} />,
  },
  {
    field: 'ssdId',
    category: 'ssd',
    title: 'SSD Depolama',
    selectLabel: '+ SSD Seç',
    description: 'İşletim sistemi ve oyun yükleme hızları için yüksek hızlı NVMe M.2 depolama.',
    renderIcon: (cls = 'h-5 w-5') => <HardDrive className={cls} />,
  },
  {
    field: 'caseId',
    category: 'pcCase',
    title: 'Bilgisayar Kasası',
    selectLabel: '+ Kasa Seç',
    description: 'Anakart form faktörü ve ekran kartı uzunluğuyla fiziksel uyumu doğrulanır.',
    renderIcon: (cls = 'h-5 w-5') => <Box className={cls} />,
  },
  {
    field: 'psuId',
    category: 'psu',
    title: 'Güç Kaynağı (PSU)',
    selectLabel: '+ Güç Kaynağı Seç',
    description: 'İşlemci ve ekran kartı tepe güç çekimine göre yeterli Watt ve kablo sunan PSU seçin.',
    renderIcon: (cls = 'h-5 w-5') => <Zap className={cls} />,
  },
  {
    field: 'coolerId',
    category: 'cooler',
    title: 'İşlemci Soğutucu',
    selectLabel: '+ Soğutucu Seç',
    description: 'İşlemci soketi, TDP ısı yükü ve kasa yüksekliği / radyatör desteği denetlenir.',
    renderIcon: (cls = 'h-5 w-5') => <Fan className={cls} />,
  },
];

const SAMPLE_STARTER_BUILD: SelectedPartIds = {
  cpuId: 'cpu-r5-7500f',
  motherboardId: 'mb-b650m-k',
  ramId: 'ram-32-d5',
  gpuId: 'gpu-rtx4070-super',
  ssdId: 'ssd-1tb-gen4',
  caseId: 'case-atx-flow',
  psuId: 'psu-750-gold',
  coolerId: 'cooler-ak400',
};

function normalizeQuery(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function getPartPrice(
  partId: string,
  catalog: PricingCatalogResponse | null
): number {
  return catalog?.partsPricing[partId]?.newPriceTry ?? 0;
}

interface PartCompatResult {
  compatible: boolean;
  reason?: string;
}

interface DbCompatRecord {
  socket?: string | null;
  ramType?: string | null;
  formFactor?: string | null;
  tdp?: number | null;
  wattage?: number | null;
  maxGpuLengthMm?: number | null;
}

type DbCompatLookup = Record<string, DbCompatRecord>;

function splitTokens(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getCpuSocket(cpu: CpuPart, dbMap: DbCompatLookup): string {
  return dbMap[cpu.id]?.socket?.trim() || cpu.socket;
}

function getCpuRamTypes(cpu: CpuPart, dbMap: DbCompatLookup): string[] {
  const fromDb = splitTokens(dbMap[cpu.id]?.ramType);
  return fromDb.length > 0 ? fromDb : cpu.supportedRam;
}

function getCpuTdp(cpu: CpuPart, dbMap: DbCompatLookup): number {
  return dbMap[cpu.id]?.tdp ?? cpu.maxPowerWatts ?? cpu.tdpWatts ?? 65;
}

function getMbSocket(mb: MotherboardPart, dbMap: DbCompatLookup): string {
  return dbMap[mb.id]?.socket?.trim() || mb.socket;
}

function getMbRamType(mb: MotherboardPart, dbMap: DbCompatLookup): string | null {
  return dbMap[mb.id]?.ramType?.trim() || mb.supportedRam;
}

function getMbFormFactor(mb: MotherboardPart, dbMap: DbCompatLookup): string {
  return dbMap[mb.id]?.formFactor?.trim() || mb.formFactor;
}

function getMbTdp(mb: MotherboardPart, dbMap: DbCompatLookup): number {
  return dbMap[mb.id]?.tdp ?? 45;
}

function getRamType(ram: RamPart, dbMap: DbCompatLookup): string | null {
  return dbMap[ram.id]?.ramType?.trim() || ram.generation;
}

function getRamTdp(ram: RamPart, dbMap: DbCompatLookup): number {
  return dbMap[ram.id]?.tdp ?? 10;
}

function getGpuTdp(gpu: GpuPart, dbMap: DbCompatLookup): number {
  return dbMap[gpu.id]?.tdp ?? gpu.peakPowerWatts ?? gpu.tdpWatts ?? (gpu.isIntegrated ? 0 : 150);
}

function getGpuRecommendedPsu(gpu: GpuPart, dbMap: DbCompatLookup): number | null {
  return dbMap[gpu.id]?.wattage ?? gpu.recommendedPsuWatts;
}

function getGpuLengthMm(gpu: GpuPart, dbMap: DbCompatLookup): number | null {
  return dbMap[gpu.id]?.maxGpuLengthMm ?? gpu.lengthMm;
}

function getSsdTdp(ssd: SsdPart, dbMap: DbCompatLookup): number {
  return dbMap[ssd.id]?.tdp ?? 8;
}

function getPsuWattage(psu: PsuPart, dbMap: DbCompatLookup): number | null {
  return dbMap[psu.id]?.wattage ?? psu.wattage;
}

function getCaseFormFactors(pcCase: CasePart, dbMap: DbCompatLookup): string[] {
  const fromDb = splitTokens(dbMap[pcCase.id]?.formFactor);
  return fromDb.length > 0 ? fromDb : pcCase.supportedFormFactors;
}

function getCaseMaxGpuLength(pcCase: CasePart, dbMap: DbCompatLookup): number | null {
  return dbMap[pcCase.id]?.maxGpuLengthMm ?? pcCase.maxGpuLengthMm;
}

function getCoolerSockets(cooler: CoolerPart, dbMap: DbCompatLookup): string[] {
  const fromDb = splitTokens(dbMap[cooler.id]?.socket);
  return fromDb.length > 0 ? fromDb : cooler.supportedSockets;
}

function getCoolerCapacityWatts(cooler: CoolerPart, dbMap: DbCompatLookup): number | null {
  return dbMap[cooler.id]?.wattage ?? cooler.maxTdpCapacityWatts;
}

function getCoolerTdp(cooler: CoolerPart, dbMap: DbCompatLookup): number {
  return dbMap[cooler.id]?.tdp ?? (cooler.coolerType === 'Sıvı Soğutma' ? 18 : 8);
}

function computeSelectedTotalTdp(
  selected: {
    cpu?: CpuPart;
    motherboard?: MotherboardPart;
    ram?: RamPart;
    gpu?: GpuPart;
    ssd?: SsdPart;
    cooler?: CoolerPart;
  },
  dbMap: DbCompatLookup
): number {
  let total = 0;
  if (selected.cpu) total += getCpuTdp(selected.cpu, dbMap);
  if (selected.gpu) total += getGpuTdp(selected.gpu, dbMap);
  if (selected.motherboard) total += getMbTdp(selected.motherboard, dbMap);
  if (selected.ram) total += getRamTdp(selected.ram, dbMap);
  if (selected.ssd) total += getSsdTdp(selected.ssd, dbMap);
  if (selected.cooler) total += getCoolerTdp(selected.cooler, dbMap);
  return total;
}

function checkCandidateCompatibility(
  field: keyof SelectedPartIds,
  candidate: BasePartSpec,
  selected: {
    cpu?: CpuPart;
    motherboard?: MotherboardPart;
    ram?: RamPart;
    gpu?: GpuPart;
    ssd?: SsdPart;
    pcCase?: CasePart;
    psu?: PsuPart;
    cooler?: CoolerPart;
  },
  dbMap: DbCompatLookup,
  selectedTotalTdp: number
): PartCompatResult {
  switch (field) {
    case 'cpuId': {
      const cpu = candidate as CpuPart;
      const cpuSocket = getCpuSocket(cpu, dbMap);
      const cpuRams = getCpuRamTypes(cpu, dbMap);
      const cpuTdp = getCpuTdp(cpu, dbMap);

      if (selected.motherboard) {
        const mb = selected.motherboard;
        const mbSocket = getMbSocket(mb, dbMap);
        if (cpuSocket !== mbSocket) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cpuSocket} soket, seçili anakartın ${mbSocket} soketine uymaz.`,
          };
        }
        if (
          cpu.generation &&
          !mb.nativeCpuGenerations.includes(cpu.generation) &&
          !mb.biosUpdateCpuGenerations.includes(cpu.generation)
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${mb.model} bu CPU neslini BIOS ile desteklemez.`,
          };
        }
        if (
          mb.vrmMaxCpuWatts !== null &&
          cpuTdp > mb.vrmMaxCpuWatts
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cpuTdp}W yükü, anakartın ${mb.vrmMaxCpuWatts}W VRM sınırını aşar.`,
          };
        }
      }
      if (selected.ram) {
        const ramGen = getRamType(selected.ram, dbMap);
        if (ramGen && !cpuRams.includes(ramGen)) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cpu.model}, seçili ${ramGen} RAM'i desteklemez.`,
          };
        }
      }
      if (selected.psu) {
        const psuWatts = getPsuWattage(selected.psu, dbMap);
        const currentCpuTdp = selected.cpu ? getCpuTdp(selected.cpu, dbMap) : 0;
        const projectedTdp = selectedTotalTdp - currentCpuTdp + cpuTdp;
        if (psuWatts !== null && psuWatts <= projectedTdp) {
          return {
            compatible: false,
            reason: `Uyumsuz: Toplam sistem TDP (${projectedTdp}W), seçili ${psuWatts}W PSU gücünü aşıyor.`,
          };
        }
      }
      return { compatible: true };
    }

    case 'motherboardId': {
      const mb = candidate as MotherboardPart;
      const mbSocket = getMbSocket(mb, dbMap);
      const mbRamType = getMbRamType(mb, dbMap);
      const mbFormFactor = getMbFormFactor(mb, dbMap);

      if (selected.cpu) {
        const cpu = selected.cpu;
        const cpuSocket = getCpuSocket(cpu, dbMap);
        const cpuTdp = getCpuTdp(cpu, dbMap);
        if (mbSocket !== cpuSocket) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${mbSocket} soket, seçili ${cpu.model} (${cpuSocket}) ile uyumsuz.`,
          };
        }
        if (
          cpu.generation &&
          !mb.nativeCpuGenerations.includes(cpu.generation) &&
          !mb.biosUpdateCpuGenerations.includes(cpu.generation)
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cpu.generation} nesli bu anakartta desteklenmiyor.`,
          };
        }
        if (
          mb.vrmMaxCpuWatts !== null &&
          cpuTdp > mb.vrmMaxCpuWatts
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: VRM (${mb.vrmMaxCpuWatts}W), işlemcinin ${cpuTdp}W yükü için yetersiz.`,
          };
        }
      }
      if (selected.ram) {
        const ramGen = getRamType(selected.ram, dbMap);
        if (ramGen && mbRamType !== ramGen) {
          return {
            compatible: false,
            reason: `Uyumsuz: Anakart ${mbRamType}, seçili RAM ise ${ramGen}.`,
          };
        }
      }
      if (selected.pcCase) {
        const supportedForms = getCaseFormFactors(selected.pcCase, dbMap);
        if (!supportedForms.includes(mbFormFactor)) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${mbFormFactor} anakart, seçili kasaya sığmaz.`,
          };
        }
      }
      return { compatible: true };
    }

    case 'ramId': {
      const ram = candidate as RamPart;
      const ramGen = getRamType(ram, dbMap);
      if (selected.motherboard) {
        const mb = selected.motherboard;
        const mbRamType = getMbRamType(mb, dbMap);
        if (ramGen !== mbRamType) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${ramGen ?? 'Bilinmeyen'} bellek, ${mbRamType} destekli anakartla çalışmaz.`,
          };
        }
        if (
          ram.modulesCount !== null &&
          mb.ramSlots !== null &&
          ram.modulesCount > mb.ramSlots
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${ram.modulesCount} modül, anakartın ${mb.ramSlots} yuvasına sığmaz.`,
          };
        }
        if (
          ram.capacityGb !== null &&
          mb.maxRamGb !== null &&
          ram.capacityGb > mb.maxRamGb
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${ram.capacityGb} GB kapasite anakartın ${mb.maxRamGb} GB sınırını aşar.`,
          };
        }
      }
      if (selected.cpu && ramGen) {
        const cpuRams = getCpuRamTypes(selected.cpu, dbMap);
        if (!cpuRams.includes(ramGen)) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${selected.cpu.model}, ${ramGen} bellek desteklemez.`,
          };
        }
      }
      return { compatible: true };
    }

    case 'gpuId': {
      const gpu = candidate as GpuPart;
      const gpuLength = getGpuLengthMm(gpu, dbMap);
      const gpuRecPsu = getGpuRecommendedPsu(gpu, dbMap);
      const gpuTdp = getGpuTdp(gpu, dbMap);

      if (gpu.isIntegrated && selected.cpu) {
        if (!selected.cpu.hasIntegratedGraphics || gpu.brand !== selected.cpu.brand) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${selected.cpu.model} için harici ekran kartı gereklidir.`,
          };
        }
      }
      if (
        !gpu.isIntegrated &&
        selected.pcCase &&
        gpuLength !== null
      ) {
        const caseMaxGpu = getCaseMaxGpuLength(selected.pcCase, dbMap);
        if (caseMaxGpu !== null && gpuLength > caseMaxGpu) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${gpuLength} mm uzunluk, seçili kasanın ${caseMaxGpu} mm sınırını aşar.`,
          };
        }
      }
      if (!gpu.isIntegrated && selected.psu) {
        const psuWatts = getPsuWattage(selected.psu, dbMap);
        const currentGpuTdp = selected.gpu ? getGpuTdp(selected.gpu, dbMap) : 0;
        const projectedTdp = selectedTotalTdp - currentGpuTdp + gpuTdp;
        if (psuWatts !== null && psuWatts <= projectedTdp) {
          return {
            compatible: false,
            reason: `Uyumsuz: Toplam ${projectedTdp}W sistem TDP yükü, seçili ${psuWatts}W PSU gücünden yüksek.`,
          };
        }
        if (psuWatts !== null && gpuRecPsu !== null && psuWatts < gpuRecPsu) {
          return {
            compatible: false,
            reason: `Uyumsuz: Önerilen ${gpuRecPsu}W PSU, seçili ${psuWatts}W PSU'dan yüksek.`,
          };
        }
      }
      return { compatible: true };
    }

    case 'caseId': {
      const pcCase = candidate as CasePart;
      const supportedForms = getCaseFormFactors(pcCase, dbMap);
      const caseMaxGpu = getCaseMaxGpuLength(pcCase, dbMap);

      if (selected.motherboard) {
        const mbFormFactor = getMbFormFactor(selected.motherboard, dbMap);
        if (!supportedForms.includes(mbFormFactor)) {
          return {
            compatible: false,
            reason: `Uyumsuz: Kasa ${mbFormFactor} anakart boyutunu desteklemiyor.`,
          };
        }
      }
      if (selected.gpu && !selected.gpu.isIntegrated) {
        const gpuLen = getGpuLengthMm(selected.gpu, dbMap);
        if (gpuLen !== null && caseMaxGpu !== null && gpuLen > caseMaxGpu) {
          return {
            compatible: false,
            reason: `Uyumsuz: Kasa maks. ${caseMaxGpu} mm, seçili GPU ${gpuLen} mm.`,
          };
        }
      }
      if (selected.cooler) {
        if (selected.cooler.coolerType === 'Sıvı Soğutma') {
          if (
            selected.cooler.radiatorMm !== null &&
            !pcCase.supportedRadiatorMm.includes(selected.cooler.radiatorMm)
          ) {
            return {
              compatible: false,
              reason: `Uyumsuz: ${selected.cooler.radiatorMm} mm radyatör bu kasada desteklenmiyor.`,
            };
          }
        } else if (
          selected.cooler.heightMm !== null &&
          pcCase.maxCoolerHeightMm !== null &&
          selected.cooler.heightMm > pcCase.maxCoolerHeightMm
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: Soğutucu yüksekliği (${selected.cooler.heightMm} mm) kasa sınırını aşar.`,
          };
        }
      }
      return { compatible: true };
    }

    case 'psuId': {
      const psu = candidate as PsuPart;
      const psuWattage = getPsuWattage(psu, dbMap);
      const gpuRecPsu = selected.gpu ? getGpuRecommendedPsu(selected.gpu, dbMap) : null;

      // Katı DB Kuralı: PSU wattage değeri, seçili parçaların toplam TDP değerinden yüksek olmalıdır.
      if (psuWattage !== null && selectedTotalTdp > 0 && psuWattage <= selectedTotalTdp) {
        return {
          compatible: false,
          reason: `Uyumsuz: Seçili parçaların toplam TDP'si (${selectedTotalTdp}W), bu ${psuWattage}W PSU için yüksek.`,
        };
      }

      const recommendedFloor = Math.max(
        gpuRecPsu ?? 0,
        selectedTotalTdp > 0 ? Math.ceil((selectedTotalTdp * 1.2) / 50) * 50 : 0
      );
      if (psuWattage !== null && recommendedFloor > 0 && psuWattage < recommendedFloor) {
        return {
          compatible: false,
          reason: `Uyumsuz: Toplam ${selectedTotalTdp}W TDP ve güvenli pay için en az ${recommendedFloor}W PSU önerilir.`,
        };
      }
      if (
        selected.gpu?.requiredConnectors &&
        psu.connectors &&
        psu.connectors.pcie8PinCount < selected.gpu.requiredConnectors.eightPinCount
      ) {
        return {
          compatible: false,
          reason: `Uyumsuz: GPU için ${selected.gpu.requiredConnectors.eightPinCount}x 8-Pin PCIe kablosu gerekli.`,
        };
      }
      return { compatible: true };
    }

    case 'coolerId': {
      const cooler = candidate as CoolerPart;
      const coolerSockets = getCoolerSockets(cooler, dbMap);
      const coolerCapacity = getCoolerCapacityWatts(cooler, dbMap);

      if (selected.cpu) {
        const cpuSocket = getCpuSocket(selected.cpu, dbMap);
        const cpuTdp = getCpuTdp(selected.cpu, dbMap);
        if (!coolerSockets.includes(cpuSocket)) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cpuSocket} soket montaj desteği yok.`,
          };
        }
        if (selected.cpu.requiresDedicatedCooler && cooler.coolerType === 'Stok / Giriş') {
          return {
            compatible: false,
            reason: `Uyumsuz: ${selected.cpu.model} için harici kule tipi veya sıvı soğutucu gerekir.`,
          };
        }
        if (coolerCapacity !== null && coolerCapacity < cpuTdp) {
          return {
            compatible: false,
            reason: `Uyumsuz: Soğutma kapasitesi (${coolerCapacity}W < ${cpuTdp}W).`,
          };
        }
      }
      if (selected.pcCase) {
        if (cooler.coolerType === 'Sıvı Soğutma') {
          if (
            cooler.radiatorMm !== null &&
            !selected.pcCase.supportedRadiatorMm.includes(cooler.radiatorMm)
          ) {
            return {
              compatible: false,
              reason: `Uyumsuz: ${cooler.radiatorMm} mm radyatör seçili kasaya sığmaz.`,
            };
          }
        } else if (
          cooler.heightMm !== null &&
          selected.pcCase.maxCoolerHeightMm !== null &&
          cooler.heightMm > selected.pcCase.maxCoolerHeightMm
        ) {
          return {
            compatible: false,
            reason: `Uyumsuz: ${cooler.heightMm} mm yükseklik seçili kasaya sığmaz.`,
          };
        }
      }
      return { compatible: true };
    }

    default:
      return { compatible: true };
  }
}

export function PCBuilder({
  preferences,
  selectedIds,
  pricingCatalog,
  pricingError,
  initialStepField,
  onRetryPricing,
  onChangeSelectedIds,
  onResetAll,
  onInspectBuild,
  onInspectPart,
  onOpenAdvisor,
}: PCBuilderProps) {
  const [openField, setOpenField] = useState<keyof SelectedPartIds | null>(
    initialStepField ?? 'cpuId'
  );
  const [hideIncompatible, setHideIncompatible] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('Tümü');
  const [slotVisibleLimit, setSlotVisibleLimit] = useState<number>(60);
  const [autoClearedNotice, setAutoClearedNotice] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  useEffect(() => {
    if (initialStepField) {
      setOpenField(initialStepField);
      setSlotVisibleLimit(60);
    }
  }, [initialStepField]);

  const mergedCatalog = useMemo(() => getMergedCatalogParts(pricingCatalog), [pricingCatalog]);

  const builderSlots = useMemo<BuilderSlotConfig[]>(() => {
    const supportedSockets = new Set(mergedCatalog.motherboards.map((m) => m.socket));
    const itemsByField: Record<keyof SelectedPartIds, BasePartSpec[]> = {
      cpuId: mergedCatalog.cpus.filter(
        (c) => !c.isUnverifiedSpecSample && supportedSockets.has(c.socket)
      ),
      motherboardId: mergedCatalog.motherboards.filter((m) => !m.isUnverifiedSpecSample),
      ramId: mergedCatalog.rams.filter((r) => !r.isUnverifiedSpecSample),
      gpuId: mergedCatalog.gpus.filter((g) => !g.isUnverifiedSpecSample),
      ssdId: mergedCatalog.ssds.filter((s) => !s.isUnverifiedSpecSample),
      caseId: mergedCatalog.cases.filter((c) => !c.isUnverifiedSpecSample),
      psuId: mergedCatalog.psus.filter((p) => !p.isUnverifiedSpecSample),
      coolerId: mergedCatalog.coolers.filter((cl) => !cl.isUnverifiedSpecSample),
    };
    return BUILDER_SLOT_META.map((meta) => ({
      ...meta,
      items: itemsByField[meta.field],
    }));
  }, [mergedCatalog]);

  const dbCompatById = useMemo<DbCompatLookup>(() => {
    const lookup: DbCompatLookup = {};
    for (const item of pricingCatalog?.catalogProducts ?? []) {
      lookup[item.id] = {
        socket: item.socket,
        ramType: item.ramType,
        formFactor: item.formFactor,
        tdp: item.tdp,
        wattage: item.wattage,
        maxGpuLengthMm: item.maxGpuLengthMm,
      };
    }
    return lookup;
  }, [pricingCatalog?.catalogProducts]);

  const resolvedParts = useMemo(() => {
    return {
      cpu: selectedIds.cpuId
        ? mergedCatalog.cpus.find((c) => c.id === selectedIds.cpuId)
        : undefined,
      motherboard: selectedIds.motherboardId
        ? mergedCatalog.motherboards.find((m) => m.id === selectedIds.motherboardId)
        : undefined,
      ram: selectedIds.ramId
        ? mergedCatalog.rams.find((r) => r.id === selectedIds.ramId)
        : undefined,
      gpu: selectedIds.gpuId
        ? mergedCatalog.gpus.find((g) => g.id === selectedIds.gpuId)
        : undefined,
      ssd: selectedIds.ssdId
        ? mergedCatalog.ssds.find((s) => s.id === selectedIds.ssdId)
        : undefined,
      pcCase: selectedIds.caseId
        ? mergedCatalog.cases.find((c) => c.id === selectedIds.caseId)
        : undefined,
      psu: selectedIds.psuId
        ? mergedCatalog.psus.find((p) => p.id === selectedIds.psuId)
        : undefined,
      cooler: selectedIds.coolerId
        ? mergedCatalog.coolers.find((cl) => cl.id === selectedIds.coolerId)
        : undefined,
    };
  }, [mergedCatalog, selectedIds]);

  const selectedCount = useMemo(
    () => builderSlots.filter((slot) => Boolean(selectedIds[slot.field])).length,
    [builderSlots, selectedIds]
  );

  const isBuildComplete = selectedCount === builderSlots.length;

  const fullBuild = useMemo(() => {
    if (!isBuildComplete || !pricingCatalog) return null;
    return assembleBuildFromIds(
      'fiyat-performans',
      selectedIds as SelectedPartIds,
      preferences,
      pricingCatalog,
      true
    );
  }, [isBuildComplete, preferences, pricingCatalog, selectedIds]);

  const fullCompatibility = useMemo(() => {
    if (!isBuildComplete) return null;
    return evaluateCompatibility({
      cpu: resolvedParts.cpu,
      gpu: resolvedParts.gpu,
      motherboard: resolvedParts.motherboard,
      ram: resolvedParts.ram,
      psu: resolvedParts.psu,
      pcCase: resolvedParts.pcCase,
      cooler: resolvedParts.cooler,
    });
  }, [isBuildComplete, resolvedParts]);

  const totalPriceTry = useMemo(() => {
    return builderSlots.reduce((sum, slot) => {
      const partId = selectedIds[slot.field];
      if (!partId) return sum;
      return sum + getPartPrice(partId, pricingCatalog);
    }, 0);
  }, [builderSlots, pricingCatalog, selectedIds]);

  const selectedTotalTdp = useMemo(
    () => computeSelectedTotalTdp(resolvedParts, dbCompatById),
    [dbCompatById, resolvedParts]
  );

  const handleToggleSlot = (field: keyof SelectedPartIds) => {
    setSearchTerm('');
    setBrandFilter('Tümü');
    setSlotVisibleLimit(60);
    setOpenField((prev) => (prev === field ? null : field));
  };

  const handleSelectCandidate = (field: keyof SelectedPartIds, partId: string) => {
    const next: Partial<SelectedPartIds> = { ...selectedIds, [field]: partId };
    const clearedLabels: string[] = [];

    if (field === 'cpuId') {
      const nextCpu = mergedCatalog.cpus.find((c) => c.id === partId);
      if (nextCpu) {
        const nextSocket = getCpuSocket(nextCpu, dbCompatById);
        const nextRamTypes = getCpuRamTypes(nextCpu, dbCompatById);

        if (next.motherboardId) {
          const curMb = mergedCatalog.motherboards.find((m) => m.id === next.motherboardId);
          if (curMb && getMbSocket(curMb, dbCompatById) !== nextSocket) {
            delete next.motherboardId;
            clearedLabels.push('Anakart');
          }
        }
        if (next.ramId) {
          const curRam = mergedCatalog.rams.find((r) => r.id === next.ramId);
          const curRamType = curRam ? getRamType(curRam, dbCompatById) : null;
          if (curRamType && !nextRamTypes.includes(curRamType)) {
            delete next.ramId;
            clearedLabels.push('RAM');
          }
        }
        if (next.coolerId) {
          const curCooler = mergedCatalog.coolers.find((cl) => cl.id === next.coolerId);
          if (curCooler && !getCoolerSockets(curCooler, dbCompatById).includes(nextSocket)) {
            delete next.coolerId;
            clearedLabels.push('Soğutucu');
          }
        }
      }
    }

    if (field === 'motherboardId') {
      const nextMb = mergedCatalog.motherboards.find((m) => m.id === partId);
      if (nextMb) {
        const nextMbRam = getMbRamType(nextMb, dbCompatById);
        const nextMbForm = getMbFormFactor(nextMb, dbCompatById);

        if (next.ramId) {
          const curRam = mergedCatalog.rams.find((r) => r.id === next.ramId);
          if (curRam && getRamType(curRam, dbCompatById) !== nextMbRam) {
            delete next.ramId;
            clearedLabels.push('RAM');
          }
        }
        if (next.caseId) {
          const curCase = mergedCatalog.cases.find((c) => c.id === next.caseId);
          if (curCase && !getCaseFormFactors(curCase, dbCompatById).includes(nextMbForm)) {
            delete next.caseId;
            clearedLabels.push('Kasa');
          }
        }
      }
    }

    if (field === 'gpuId') {
      const nextGpu = mergedCatalog.gpus.find((g) => g.id === partId);
      if (nextGpu && !nextGpu.isIntegrated && next.caseId) {
        const curCase = mergedCatalog.cases.find((c) => c.id === next.caseId);
        const gpuLen = getGpuLengthMm(nextGpu, dbCompatById);
        const caseMaxLen = curCase ? getCaseMaxGpuLength(curCase, dbCompatById) : null;
        if (curCase && gpuLen !== null && caseMaxLen !== null && gpuLen > caseMaxLen) {
          delete next.caseId;
          clearedLabels.push('Kasa');
        }
      }
    }

    // Toplam TDP değiştiğinde seçili PSU yetersiz kalıyorsa otomatik temizle
    if (field !== 'psuId' && next.psuId) {
      const curPsu = mergedCatalog.psus.find((p) => p.id === next.psuId);
      const psuWatts = curPsu ? getPsuWattage(curPsu, dbCompatById) : null;
      const nextSelectedResolved = {
        cpu: next.cpuId ? mergedCatalog.cpus.find((c) => c.id === next.cpuId) : undefined,
        motherboard: next.motherboardId
          ? mergedCatalog.motherboards.find((m) => m.id === next.motherboardId)
          : undefined,
        ram: next.ramId ? mergedCatalog.rams.find((r) => r.id === next.ramId) : undefined,
        gpu: next.gpuId ? mergedCatalog.gpus.find((g) => g.id === next.gpuId) : undefined,
        ssd: next.ssdId ? mergedCatalog.ssds.find((s) => s.id === next.ssdId) : undefined,
        cooler: next.coolerId
          ? mergedCatalog.coolers.find((cl) => cl.id === next.coolerId)
          : undefined,
      };
      const nextTotalTdp = computeSelectedTotalTdp(nextSelectedResolved, dbCompatById);
      const nextGpuRec = nextSelectedResolved.gpu
        ? getGpuRecommendedPsu(nextSelectedResolved.gpu, dbCompatById) ?? 0
        : 0;
      const requiredWatts = Math.max(nextTotalTdp + 1, nextGpuRec);
      if (psuWatts !== null && psuWatts < requiredWatts) {
        delete next.psuId;
        clearedLabels.push('Güç Kaynağı (PSU)');
      }
    }

    if (clearedLabels.length > 0) {
      setAutoClearedNotice(
        `Yeni seçiminizle uyumsuz kalan ${clearedLabels.join(', ')} seçimi otomatik temizlendi.`
      );
    } else {
      setAutoClearedNotice(null);
    }

    onChangeSelectedIds(next);
    setSearchTerm('');
    setBrandFilter('Tümü');
    setSlotVisibleLimit(60);

    const currentIdx = builderSlots.findIndex((s) => s.field === field);
    const nextEmptySlot = builderSlots.slice(currentIdx + 1).find((s) => !next[s.field]);
    setOpenField(nextEmptySlot ? nextEmptySlot.field : null);
  };

  const handleClearSlot = (field: keyof SelectedPartIds) => {
    const next = { ...selectedIds };
    delete next[field];
    onChangeSelectedIds(next);
  };

  const handleCopyList = async () => {
    const lines = builderSlots.map((slot) => {
      const pid = selectedIds[slot.field];
      const part = pid ? slot.items.find((i) => i.id === pid) : undefined;
      if (!part) return `${slot.title}: Seçilmedi`;
      const price = getPartPrice(part.id, pricingCatalog);
      return `${slot.title}: ${part.model} (${price > 0 ? formatTry(price) : 'Fiyat Yok'})`;
    });
    lines.push(`---`);
    lines.push(`Toplam Sistem TDP: ${selectedTotalTdp}W`);
    lines.push(`Toplam Tutar: ${formatTry(totalPriceTry)}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  const activeFilterSummary = useMemo(() => {
    const chips: string[] = [];
    if (resolvedParts.cpu) {
      chips.push(`Soket: ${getCpuSocket(resolvedParts.cpu, dbCompatById)}`);
    }
    if (resolvedParts.motherboard) {
      chips.push(`Bellek: ${getMbRamType(resolvedParts.motherboard, dbCompatById)}`);
      chips.push(`Form Faktörü: ${getMbFormFactor(resolvedParts.motherboard, dbCompatById)}`);
    }
    if (resolvedParts.gpu && !resolvedParts.gpu.isIntegrated) {
      const gpuLen = getGpuLengthMm(resolvedParts.gpu, dbCompatById);
      if (gpuLen) chips.push(`GPU Uzunluğu: ${gpuLen} mm`);
    }
    if (selectedTotalTdp > 0) {
      chips.push(`Toplam TDP: ${selectedTotalTdp}W`);
    }
    return chips;
  }, [dbCompatById, resolvedParts, selectedTotalTdp]);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header Banner */}
      <div className="mb-10 rounded-2xl border border-slate-700/60 bg-slate-800/80 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#246BFD]">
              Akıllı Donanım Sihirbazı
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-[#F5F7FA] sm:text-3xl">
              Kendin Topla — Sıfırdan PC Toplama Sihirbazı
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
              Parçaları adım adım seçin. İşlemci soketi (AM4/AM5/LGA1700/LGA1851), anakart bellek tipi
              (DDR4/DDR5), kasa ölçüsü ve güç kaynağı kapasitesi gerçek zamanlı olarak kontrol edilir.
            </p>

            {activeFilterSummary.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#FF7900]">
                  Aktif Uyum Filtreleri:
                </span>
                {activeFilterSummary.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-md border border-[#246BFD]/40 bg-[#246BFD]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#F5F7FA]"
                  >
                    <ShieldCheck className="h-3 w-3 text-[#246BFD]" />
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenAdvisor && (
              <button
                type="button"
                onClick={onOpenAdvisor}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-[#FF7900] px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-[#FF8E29] whitespace-nowrap"
              >
                <Gauge className="h-4 w-4 shrink-0" />
                <span>Bütçe &amp; Oyuna Göre Sistem Öner (FPS)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAutoClearedNotice(null);
                onChangeSelectedIds(SAMPLE_STARTER_BUILD);
                setOpenField(null);
              }}
              className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-[#246BFD]/50 bg-[#246BFD]/15 px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:bg-[#246BFD]"
            >
              <Sparkles className="h-4 w-4 text-[#FF7900]" />
              <span>Örnek Sistem Doldur</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoClearedNotice(null);
                onResetAll();
                setOpenField('cpuId');
              }}
              className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-semibold text-[#94A3B8] transition-colors hover:border-[#FF7900] hover:text-[#F5F7FA]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Sıfırla</span>
            </button>
          </div>
        </div>

        {/* Compatibility Filter Toggle */}
        <div className="mt-6 flex justify-end border-t border-slate-800/80 pt-5">
          <button
            type="button"
            onClick={() => setHideIncompatible((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-[#080B12] px-3 py-1.5 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#246BFD]"
          >
            {hideIncompatible ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-[#246BFD]" />
                <span>Uyumsuz Parçalar Gizleniyor</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-[#FF7900]" />
                <span>Uyumsuzlar Kilitli Gösteriliyor</span>
              </>
            )}
          </button>
        </div>
      </div>

      {pricingError && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <span>Canlı mağaza fiyatları alınamadı: {pricingError}</span>
          <button
            type="button"
            onClick={onRetryPricing}
            className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-[#080B12]"
          >
            Yenile
          </button>
        </div>
      )}

      {autoClearedNotice && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#246BFD]/50 bg-[#246BFD]/15 px-4 py-3 text-xs text-[#F5F7FA]">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-[#246BFD]" />
            {autoClearedNotice}
          </span>
          <button
            type="button"
            onClick={() => setAutoClearedNotice(null)}
            className="cursor-pointer text-[#94A3B8] hover:text-white"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Main 2-Column Builder Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left: Vertical Component Slots List */}
        <div className="space-y-4 lg:col-span-8">
          {builderSlots.map((slot, index) => {
            const selectedId = selectedIds[slot.field];
            const selectedPart = selectedId
              ? slot.items.find((item) => item.id === selectedId)
              : undefined;
            const selectedPrice = selectedPart
              ? getPartPrice(selectedPart.id, pricingCatalog)
              : 0;
            const isOpen = openField === slot.field;

            const evaluatedItems = slot.items.map((item) => ({
              part: item,
              compat: checkCandidateCompatibility(
                slot.field,
                item,
                resolvedParts,
                dbCompatById,
                selectedTotalTdp
              ),
              price: getPartPrice(item.id, pricingCatalog),
            }));

            const compatibleCount = evaluatedItems.filter((e) => e.compat.compatible).length;
            const brands = Array.from(new Set(slot.items.map((i) => i.brand))).sort();

            const normSearch = normalizeQuery(searchTerm);
            const visibleItems = evaluatedItems
              .filter(({ part, compat }) => {
                if (hideIncompatible && !compat.compatible) return false;
                if (brandFilter !== 'Tümü' && part.brand !== brandFilter) return false;
                if (normSearch.length > 0) {
                  const hay = normalizeQuery(`${part.brand} ${part.model} ${part.specSummary}`);
                  if (!hay.includes(normSearch)) return false;
                }
                return true;
              })
              .sort((a, b) => {
                if (a.compat.compatible !== b.compat.compatible) {
                  return a.compat.compatible ? -1 : 1;
                }
                return a.price - b.price;
              });

            const slotHintBadge =
              slot.field === 'motherboardId' && resolvedParts.cpu
                ? `Soket: ${getCpuSocket(resolvedParts.cpu, dbCompatById)}`
                : slot.field === 'ramId' && resolvedParts.motherboard
                  ? `Bellek: ${getMbRamType(resolvedParts.motherboard, dbCompatById)}`
                  : slot.field === 'ramId' && resolvedParts.cpu
                    ? `Destek: ${getCpuRamTypes(resolvedParts.cpu, dbCompatById).join(' / ')}`
                    : slot.field === 'caseId' && resolvedParts.motherboard
                      ? `Boyut: ${getMbFormFactor(resolvedParts.motherboard, dbCompatById)}`
                      : slot.field === 'psuId' && selectedTotalTdp > 0
                        ? `Min PSU > ${selectedTotalTdp}W TDP`
                        : slot.field === 'coolerId' && resolvedParts.cpu
                          ? `Soket: ${getCpuSocket(resolvedParts.cpu, dbCompatById)}`
                          : null;

            return (
              <section
                key={slot.field}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  isOpen
                    ? 'border-[#246BFD] bg-[#111827] shadow-[0_12px_36px_-18px_rgba(36,107,253,0.65)]'
                    : selectedPart
                      ? 'border-slate-700/90 bg-[#111827]'
                      : 'border-slate-800/90 bg-[#0D1320]'
                }`}
              >
                {/* Slot Row */}
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                        selectedPart
                          ? 'border-[#FF7900]/40 bg-[#FF7900]/10 text-[#FF7900]'
                          : 'border-slate-700 bg-[#080B12] text-[#246BFD]'
                      }`}
                    >
                      {slot.renderIcon('h-5 w-5')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#94A3B8]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h2 className="text-sm font-bold text-[#F5F7FA]">{slot.title}</h2>
                        {slotHintBadge && (
                          <span className="rounded bg-[#246BFD]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#60A5FA]">
                            {slotHintBadge}
                          </span>
                        )}
                      </div>

                      {selectedPart ? (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => onInspectPart(slot.category, selectedPart.id)}
                            className="cursor-pointer text-left text-sm font-semibold text-[#F5F7FA] hover:text-[#FF7900] transition-colors"
                          >
                            {selectedPart.model}
                          </button>
                          <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                            {selectedPart.specSummary}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-[#94A3B8]">{slot.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right Side of Slot Row: Price + Select/Change Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end shrink-0">
                    {selectedPart ? (
                      <>
                        <div className="text-left sm:text-right">
                          <span className="block font-mono text-base font-extrabold tabular-nums text-[#FF7900]">
                            {selectedPrice > 0 ? formatTry(selectedPrice) : 'Fiyat Bekleniyor'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onInspectPart(slot.category, selectedPart.id)}
                            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#246BFD] hover:underline"
                          >
                            <span>Mağaza Fiyatları</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSlot(slot.field)}
                            className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-[#080B12] px-3.5 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#246BFD]"
                          >
                            <span>Değiştir</span>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearSlot(slot.field)}
                            aria-label={`${slot.title} seçimini kaldır`}
                            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-800 bg-[#080B12] text-[#94A3B8] transition-colors hover:border-red-500/50 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleSlot(slot.field)}
                        className={`inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                          isOpen
                            ? 'border border-slate-600 bg-[#080B12] text-[#F5F7FA]'
                            : 'bg-[#FF7900] text-[#080B12] hover:bg-[#FF912E]'
                        }`}
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Listeyi Kapat</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>{slot.selectLabel.replace(/^\+\s*/, '')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Smart-Filtered Picker */}
                {isOpen && (
                  <div className="border-t border-slate-800 bg-[#080B12]/90 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSlotVisibleLimit(60);
                          }}
                          placeholder={`${slot.title} içinde model veya özellik ara...`}
                          className="h-10 w-full rounded-xl border border-slate-700 bg-[#111827] pl-9 pr-3 text-xs text-[#F5F7FA] placeholder:text-[#94A3B8] focus:border-[#246BFD] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {['Tümü', ...brands].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setBrandFilter(b);
                              setSlotVisibleLimit(60);
                            }}
                            className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                              brandFilter === b
                                ? 'bg-[#246BFD] text-white'
                                : 'border border-slate-700 bg-[#111827] text-[#94A3B8] hover:text-[#F5F7FA]'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span>
                        <strong className="text-[#F5F7FA]">{compatibleCount}</strong> uyumlu seçenek
                        {evaluatedItems.length > compatibleCount && (
                          <>
                            {' '}
                            · {evaluatedItems.length - compatibleCount} uyumsuz parça{' '}
                            {hideIncompatible ? 'gizlendi' : 'kilitli'}
                          </>
                        )}
                      </span>
                      {slotHintBadge && (
                        <span className="font-mono font-semibold text-[#60A5FA]">
                          Aktif Kriter: {slotHintBadge}
                        </span>
                      )}
                    </div>

                    {visibleItems.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-[#111827] px-4 py-6 text-center text-xs text-[#94A3B8]">
                        Arama kriterinize uygun parça bulunamadı.
                      </div>
                    ) : (
                      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                        {visibleItems.slice(0, slotVisibleLimit).map(({ part, compat, price }) => {
                          const isSelected = selectedId === part.id;
                          const imageUrl = pricingCatalog?.productImages?.[part.id] ?? null;

                          return (
                            <div
                              key={part.id}
                              className={`flex flex-col gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                                !compat.compatible
                                  ? 'border-red-900/40 bg-[#111827]/40 opacity-65'
                                  : isSelected
                                    ? 'border-[#FF7900] bg-[#162033]'
                                    : 'border-slate-800 bg-[#111827] hover:border-slate-600'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3.5">
                                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-[#080B12]">
                                  <ProductImage
                                    compact
                                    imageUrl={imageUrl}
                                    category={slot.category}
                                    model={part.model}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-semibold text-[#246BFD]">
                                      {part.brand}
                                    </span>
                                    {compat.compatible ? (
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Uyumlu
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        Uyumsuz
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-0.5 truncate text-sm font-bold text-[#F5F7FA]">
                                    {part.model}
                                  </p>
                                  <p className="mt-0.5 text-xs text-[#94A3B8]">
                                    {part.specSummary}
                                  </p>
                                  {!compat.compatible && compat.reason && (
                                    <p className="mt-1 text-[11px] font-medium text-red-400">
                                      {compat.reason}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                                <span className="font-mono text-sm font-extrabold tabular-nums text-[#FF7900]">
                                  {price > 0 ? formatTry(price) : 'Fiyat Yok'}
                                </span>

                                <button
                                  type="button"
                                  disabled={!compat.compatible}
                                  onClick={() => handleSelectCandidate(slot.field, part.id)}
                                  className={`min-h-[38px] rounded-xl px-4 py-1.5 text-xs font-bold transition-colors ${
                                    !compat.compatible
                                      ? 'cursor-not-allowed border border-red-900/50 bg-red-950/30 text-red-400'
                                      : isSelected
                                        ? 'cursor-pointer bg-emerald-500 text-[#080B12]'
                                        : 'cursor-pointer bg-[#246BFD] text-white hover:bg-[#3B7DFF]'
                                  }`}
                                >
                                  {!compat.compatible
                                    ? 'Uyumsuz'
                                    : isSelected
                                      ? 'Seçili'
                                      : 'Seç'}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {visibleItems.length > slotVisibleLimit && (
                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSlotVisibleLimit((prev) => prev + 60)}
                              className="cursor-pointer rounded-xl border border-slate-700 bg-[#111827] px-4 py-2 text-xs font-semibold text-[#F5F7FA] transition-colors hover:border-[#246BFD] hover:text-[#60A5FA]"
                            >
                              Daha Fazla Göster (+{Math.min(60, visibleItems.length - slotVisibleLimit)}{' '}
                              / Kalan {visibleItems.length - slotVisibleLimit})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Right: Sticky System Summary & Total Price Panel */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#246BFD]">
                  Canlı Sepet
                </p>
                <h2 className="mt-0.5 font-display text-lg font-extrabold text-[#F5F7FA]">
                  Sistem Özeti
                </h2>
              </div>
              <span className="rounded-lg border border-slate-700 bg-[#080B12] px-2.5 py-1 font-mono text-xs font-bold text-[#FF7900]">
                {selectedCount} / {builderSlots.length} Parça
              </span>
            </div>

            {/* Selected Parts Breakdown */}
            <div className="mt-4 space-y-2.5">
              {builderSlots.map((slot) => {
                const pid = selectedIds[slot.field];
                const part = pid ? slot.items.find((i) => i.id === pid) : undefined;
                const price = part
                  ? getPartPrice(part.id, pricingCatalog)
                  : 0;

                return (
                  <div
                    key={slot.field}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#080B12]/70 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        {slot.title}
                      </span>
                      {part ? (
                        <span className="mt-0.5 block truncate font-semibold text-[#F5F7FA]">
                          {part.model}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenField(slot.field)}
                          className="mt-0.5 cursor-pointer text-[11px] font-semibold text-[#246BFD] hover:text-[#FF7900]"
                        >
                          {slot.selectLabel}
                        </button>
                      )}
                    </div>
                    <span
                      className={`shrink-0 font-mono text-xs font-bold tabular-nums ${
                        part && price > 0 ? 'text-[#FF7900]' : 'text-slate-600'
                      }`}
                    >
                      {part ? (price > 0 ? formatTry(price) : '—') : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Compatibility & Wattage Summary */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-[#080B12] p-3.5">
              {fullCompatibility ? (
                <div className="flex items-start gap-2.5">
                  {fullCompatibility.overallStatus === 'verified' ? (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-[#F5F7FA]">
                      {fullCompatibility.overallStatus === 'verified'
                        ? 'Tüm Parçalar %100 Uyumlu'
                        : 'Teknik Denetim Uyarısı'}
                    </p>
                    <p className="mt-0.5 text-[#94A3B8]">
                      {fullCompatibility.verifiedCount}/{fullCompatibility.totalChecks} kontrol
                      doğrulandı · Toplam Sistem TDP: <strong className="text-[#F5F7FA]">{selectedTotalTdp}W</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#246BFD]" />
                  <div>
                    <p className="font-semibold text-[#F5F7FA]">
                      Akıllı Uyum Filtresi Aktif
                    </p>
                    <p className="mt-0.5 text-[#94A3B8]">
                      {selectedCount === 0
                        ? 'İşlemci seçerek uyumlu anakart ve RAM filtrelemesini başlatın.'
                        : `${builderSlots.length - selectedCount} parça daha seçildiğinde tam sistem raporu hazırlanır.`}
                      {selectedTotalTdp > 0 ? ` (Toplam TDP: ${selectedTotalTdp}W)` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Total Price */}
            <div className="mt-5 border-t border-slate-800 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Toplam Tutar
                </span>
                <span className="font-mono text-3xl font-extrabold tabular-nums text-[#FF7900]">
                  {formatTry(totalPriceTry)}
                </span>
              </div>
              <p className="mt-1 text-right text-[11px] text-[#94A3B8]">
                Güncel sıfır piyasa fiyatları baz alınmıştır.
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={!fullBuild}
                onClick={() => fullBuild && onInspectBuild(fullBuild)}
                className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                  fullBuild
                    ? 'cursor-pointer bg-[#FF7900] text-[#080B12] shadow-[0_12px_28px_-12px_rgba(255,121,0,0.75)] hover:bg-[#FF912E]'
                    : 'cursor-not-allowed border border-slate-800 bg-[#080B12] text-slate-500'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {fullBuild ? 'Sistem Detayını ve Performansı Gör' : 'Tamamlamak İçin Parçaları Seçin'}
                </span>
              </button>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => void handleCopyList()}
                className={`flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                  selectedCount > 0
                    ? 'cursor-pointer border-slate-700 bg-[#080B12] text-[#F5F7FA] hover:border-[#246BFD]'
                    : 'cursor-not-allowed border-slate-800 bg-[#080B12] text-slate-600'
                }`}
              >
                <Copy className="h-3.5 w-3.5 text-[#246BFD]" />
                <span>{copiedSummary ? 'Parça Listesi Kopyalandı!' : 'Parça Listesini Kopyala'}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
