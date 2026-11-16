import {
  CasePart,
  CheckStatus,
  CompatibilityCheckItem,
  CompatibilityReport,
  CoolerPart,
  CpuPart,
  GpuPart,
  MotherboardPart,
  PsuPart,
  RamPart,
} from '../types/pc';

const SYSTEM_PEAK_OVERHEAD_WATTS = 95; // Anakart, RAM, NVMe, fanlar, pompa ve USB yükleri
const SAFE_PSU_HEADROOM_FACTOR = 1.25; // %25 güvenli kapasite payı

export interface CompatibilityInput {
  cpu: CpuPart | undefined;
  gpu: GpuPart | undefined;
  motherboard: MotherboardPart | undefined;
  ram: RamPart | undefined;
  psu: PsuPart | undefined;
  pcCase: CasePart | undefined;
  cooler: CoolerPart | undefined;
}

/**
 * 10 Maddeli Zorunlu Teknik Uyumluluk Denetimi:
 * 1. İşlemci ve anakart soket uyumu
 * 2. Anakart ve RAM DDR4/DDR5 uyumu
 * 3. Anakart BIOS işlemci desteği
 * 4. RAM frekansı, yuva ve kapasite desteği
 * 5. Ekran kartı uzunluğu/kalınlığı ve kasa uyumu
 * 6. İşlemci soğutucu yüksekliği/radyatör ve kasa uyumu
 * 7. İşlemci soğutucu gereksinimi ve soğutma kapasitesi
 * 8. Anakart VRM kapasitesi
 * 9. PSU watt kapasitesi (gerçekçi maksimum güç tüketimi + güvenli kapasite payı)
 * 10. PSU güç bağlantıları
 *
 * Kural: Bir kontrol gerçek teknik verilerle doğrulanamadıysa asla "verified" gösterilmez.
 */
export function evaluateCompatibility({
  cpu,
  gpu,
  motherboard,
  ram,
  psu,
  pcCase,
  cooler,
}: CompatibilityInput): CompatibilityReport {
  const checks: CompatibilityCheckItem[] = [];
  const warnings: string[] = [];

  // 1. İşlemci ve Anakart Soket Uyumu
  if (!cpu || !motherboard || !cpu.socket || !motherboard.socket) {
    const msg = 'İşlemci veya anakart soket verisi eksik; soket uyumu doğrulanamadı.';
    checks.push({
      id: 'socket',
      title: 'İşlemci ve Anakart Soketi',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (cpu.socket === motherboard.socket) {
    checks.push({
      id: 'socket',
      title: 'İşlemci ve Anakart Soketi',
      status: 'verified',
      message: `Doğrulandı: ${cpu.model} (${cpu.socket}) ve ${motherboard.model} (${motherboard.socket}) aynı sokete sahiptir.`,
    });
  } else {
    const msg = `Soket uyumsuzluğu: ${cpu.model} (${cpu.socket}) ile ${motherboard.model} (${motherboard.socket}) uyumsuzdur.`;
    checks.push({
      id: 'socket',
      title: 'İşlemci ve Anakart Soketi',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  }

  // 2. Anakart ve RAM DDR4/DDR5 Uyumu
  if (!ram || !motherboard || !ram.generation || !motherboard.supportedRam) {
    const msg = 'RAM nesli veya anakart bellek tipi eksik; DDR uyumu doğrulanamadı.';
    checks.push({
      id: 'ram_gen',
      title: 'Anakart ve RAM DDR4/DDR5 Uyumu',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (ram.generation !== motherboard.supportedRam) {
    const msg = `DDR uyumsuzluğu: ${ram.generation} bellek, yalnızca ${motherboard.supportedRam} destekleyen ${motherboard.model} anakarta uymaz.`;
    checks.push({
      id: 'ram_gen',
      title: 'Anakart ve RAM DDR4/DDR5 Uyumu',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (cpu && !cpu.supportedRam.includes(ram.generation)) {
    const msg = `İşlemci bellek uyumsuzluğu: ${cpu.model}, ${ram.generation} belleği desteklemez.`;
    checks.push({
      id: 'ram_gen',
      title: 'Anakart ve RAM DDR4/DDR5 Uyumu',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else {
    checks.push({
      id: 'ram_gen',
      title: 'Anakart ve RAM DDR4/DDR5 Uyumu',
      status: 'verified',
      message: `Doğrulandı: ${ram.generation} bellek, anakart ve işlemci bellek denetleyicisi ile uyumludur.`,
    });
  }

  // 3. Anakart BIOS İşlemci Desteği
  if (!cpu || !motherboard || !cpu.generation) {
    const msg = 'İşlemci nesil verisi eksik; anakart BIOS desteği doğrulanamadı.';
    checks.push({
      id: 'bios',
      title: 'Anakart BIOS İşlemci Desteği',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (cpu.socket !== motherboard.socket) {
    checks.push({
      id: 'bios',
      title: 'Anakart BIOS İşlemci Desteği',
      status: 'incompatible',
      message: `Soket uyumsuzluğu nedeniyle ${cpu.generation} BIOS desteği sağlanamaz.`,
    });
  } else if (motherboard.nativeCpuGenerations.includes(cpu.generation)) {
    checks.push({
      id: 'bios',
      title: 'Anakart BIOS İşlemci Desteği',
      status: 'verified',
      message: `Doğrulandı: ${motherboard.model}, ${cpu.generation} işlemcileri fabrika BIOS sürümüyle doğrudan destekler.`,
    });
  } else if (motherboard.biosUpdateCpuGenerations.includes(cpu.generation)) {
    const msg = `BIOS güncellemesi gerekebilir: ${motherboard.model}, ${cpu.generation} işlemciler için güncel BIOS ister (${
      motherboard.hasBiosFlashback
        ? 'BIOS Flashback mevcut'
        : 'BIOS Flashback yok; eski CPU gerekebilir'
    }).`;
    checks.push({
      id: 'bios',
      title: 'Anakart BIOS İşlemci Desteği',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else {
    const msg = `BIOS desteği yok: ${motherboard.model}, ${cpu.generation} neslini desteklemiyor.`;
    checks.push({
      id: 'bios',
      title: 'Anakart BIOS İşlemci Desteği',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  }

  // 4. RAM Frekansı, Modül Sayısı ve Kapasite Desteği
  if (
    !ram ||
    !motherboard ||
    ram.capacityGb === null ||
    ram.modulesCount === null ||
    ram.speedMhz === null ||
    motherboard.ramSlots === null ||
    motherboard.maxRamGb === null ||
    motherboard.maxRamSpeedMhz === null
  ) {
    const msg = 'RAM veya anakart kapasite/frekans/yuva verisi eksik; doğrulanamadı.';
    checks.push({
      id: 'ram_spec',
      title: 'RAM Frekansı ve Kapasite Desteği',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (ram.modulesCount > motherboard.ramSlots) {
    const msg = `RAM yuva yetersizliği: ${ram.modulesCount} modül, ${motherboard.ramSlots} yuvalı anakarta sığmaz.`;
    checks.push({
      id: 'ram_spec',
      title: 'RAM Frekansı ve Kapasite Desteği',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (ram.capacityGb > motherboard.maxRamGb) {
    const msg = `Kapasite aşımı: ${ram.capacityGb} GB RAM, anakartın ${motherboard.maxRamGb} GB sınırını aşıyor.`;
    checks.push({
      id: 'ram_spec',
      title: 'RAM Frekansı ve Kapasite Desteği',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (ram.speedMhz > motherboard.maxRamSpeedMhz) {
    const msg = `Frekans doğrulaması: ${ram.speedMhz} MHz bellek, anakartın ${motherboard.maxRamSpeedMhz} MHz sınırının üzerinde; düşük frekansta çalışabilir.`;
    checks.push({
      id: 'ram_spec',
      title: 'RAM Frekansı ve Kapasite Desteği',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else {
    checks.push({
      id: 'ram_spec',
      title: 'RAM Frekansı ve Kapasite Desteği',
      status: 'verified',
      message: `Doğrulandı: ${ram.capacityGb} GB (${ram.modulesCount} modül, ${ram.speedMhz} MHz) anakartın ${motherboard.ramSlots} yuvası ve ${motherboard.maxRamSpeedMhz} MHz limiti içindedir.`,
    });
  }

  // 5. Ekran Kartı Uzunluğu / Kalınlığı ve Kasa Uyumu
  if (!pcCase || !motherboard || !gpu) {
    const msg = 'Kasa, anakart veya ekran kartı bilgisi eksik; kasa uyumu doğrulanamadı.';
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (!pcCase.supportedFormFactors.includes(motherboard.formFactor)) {
    const msg = `Form faktörü uyumsuz: ${motherboard.formFactor} anakart, ${pcCase.model} (${pcCase.supportedFormFactors.join(', ')}) kasaya sığmaz.`;
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (gpu.isIntegrated) {
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'verified',
      message: `Doğrulandı: ${motherboard.formFactor} anakart kasaya uygundur; dahili GPU ek uzunluk gerektirmez.`,
    });
  } else if (
    gpu.lengthMm === null ||
    gpu.widthSlots === null ||
    pcCase.maxGpuLengthMm === null ||
    pcCase.expansionSlots === null
  ) {
    const msg = 'GPU uzunluk veya kasa GPU açıklık ölçüsü eksik; fiziksel sığma doğrulanamadı.';
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
    const msg = `GPU sığmıyor: ${gpu.model} (${gpu.lengthMm} mm), ${pcCase.model} kasasının ${pcCase.maxGpuLengthMm} mm sınırını ${gpu.lengthMm - pcCase.maxGpuLengthMm} mm aşıyor.`;
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (gpu.widthSlots > pcCase.expansionSlots) {
    const msg = `Yuva yetersiz: ${gpu.widthSlots} yuvalı GPU, kasanın ${pcCase.expansionSlots} genişleme yuvasına sığmaz.`;
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else {
    checks.push({
      id: 'gpu_case',
      title: 'Ekran Kartı Uzunluğu ve Kasa Uyumu',
      status: 'verified',
      message: `Doğrulandı: ${gpu.lengthMm} mm GPU (${gpu.widthSlots} yuva), ${pcCase.maxGpuLengthMm} mm kasa alanında ${pcCase.maxGpuLengthMm - gpu.lengthMm} mm boşlukla sığar.`,
    });
  }

  // 6. İşlemci Soğutucu Gereksinimi ve Soğutma Kapasitesi
  if (!cpu || !cooler || cpu.maxPowerWatts === null || cooler.maxTdpCapacityWatts === null) {
    const msg =
      'İşlemci maksimum güç değeri veya soğutucu kapasite verisi eksik; soğutma yeterliliği doğrulanamadı.';
    checks.push({
      id: 'cooler_req',
      title: 'İşlemci Soğutucu Gereksinimi',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (!cooler.supportedSockets.includes(cpu.socket)) {
    const msg = `Soğutucu soket uyumsuzluğu: ${cooler.model}, ${cpu.socket} işlemci soketiyle uyumlu montaj kiti sunmuyor.`;
    checks.push({
      id: 'cooler_req',
      title: 'İşlemci Soğutucu Gereksinimi',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (cpu.requiresDedicatedCooler && cooler.coolerType === 'Stok / Giriş') {
    const msg = `Özel soğutucu gerekli: ${cpu.model} (maks. ${cpu.maxPowerWatts}W) harici kule tipi veya sıvı soğutucu olmadan stok soğutucu ile güvenle soğutulamaz.`;
    checks.push({
      id: 'cooler_req',
      title: 'İşlemci Soğutucu Gereksinimi',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else if (cooler.maxTdpCapacityWatts < cpu.maxPowerWatts) {
    const msg = `Yetersiz soğutma kapasitesi: ${cooler.model} (${cooler.maxTdpCapacityWatts}W), ${cpu.model} işlemcinin ${cpu.maxPowerWatts}W maksimum turbo yükü için yetersizdir.`;
    checks.push({
      id: 'cooler_req',
      title: 'İşlemci Soğutucu Gereksinimi',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else {
    checks.push({
      id: 'cooler_req',
      title: 'İşlemci Soğutucu Gereksinimi',
      status: 'verified',
      message: `Doğrulandı: ${cooler.model} (${cooler.maxTdpCapacityWatts}W kapasite), ${cpu.model} (${cpu.maxPowerWatts}W maks. yük) ve ${cpu.socket} soketi için yeterlidir.`,
    });
  }

  // 7. İşlemci Soğutucu Yüksekliği / Radyatör ve Kasa Uyumu
  if (!cooler || !pcCase) {
    const msg = 'Soğutucu veya kasa verisi eksik; soğutucu-kasa sığması doğrulanamadı.';
    checks.push({
      id: 'cooler_case',
      title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (cooler.coolerType === 'Sıvı Soğutma') {
    if (cooler.radiatorMm === null || pcCase.supportedRadiatorMm.length === 0) {
      const msg = 'Radyatör veya kasa radyatör desteği verisi eksik; doğrulanamadı.';
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'needs_verification',
        message: msg,
      });
      warnings.push(msg);
    } else if (!pcCase.supportedRadiatorMm.includes(cooler.radiatorMm)) {
      const msg = `Radyatör sığmıyor: ${cooler.radiatorMm} mm sıvı soğutma radyatörü, ${pcCase.model} kasasında desteklenmiyor (desteklenen: ${pcCase.supportedRadiatorMm.join(', ')} mm).`;
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'incompatible',
        message: msg,
      });
      warnings.push(msg);
    } else {
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'verified',
        message: `Doğrulandı: ${cooler.radiatorMm} mm sıvı soğutma radyatörü ${pcCase.model} kasasına monte edilebilir.`,
      });
    }
  } else {
    if (cooler.heightMm === null || pcCase.maxCoolerHeightMm === null) {
      const msg =
        'Hava soğutucu yüksekliği veya kasa maksimum soğutucu yüksekliği eksik; doğrulanamadı.';
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'needs_verification',
        message: msg,
      });
      warnings.push(msg);
    } else if (cooler.heightMm > pcCase.maxCoolerHeightMm) {
      const msg = `Soğutucu yüksekliği aşımı: ${cooler.heightMm} mm soğutucu, kasanın ${pcCase.maxCoolerHeightMm} mm sınırını aşıyor.`;
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'incompatible',
        message: msg,
      });
      warnings.push(msg);
    } else {
      checks.push({
        id: 'cooler_case',
        title: 'Soğutucu Yüksekliği ve Kasa Uyumu',
        status: 'verified',
        message: `Doğrulandı: ${cooler.heightMm} mm soğutucu yüksekliği, kasanın ${pcCase.maxCoolerHeightMm} mm sınırına uygundur.`,
      });
    }
  }

  // 8. Anakart VRM Kapasitesi
  if (!cpu || !motherboard || cpu.maxPowerWatts === null || motherboard.vrmMaxCpuWatts === null) {
    const msg = 'İşlemci maksimum gücü veya anakart VRM kapasite verisi eksik; doğrulanamadı.';
    checks.push({
      id: 'vrm',
      title: 'Anakart VRM Kapasitesi',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else if (cpu.socket !== motherboard.socket) {
    checks.push({
      id: 'vrm',
      title: 'Anakart VRM Kapasitesi',
      status: 'incompatible',
      message: 'Soket uyumsuzluğu nedeniyle anakart VRM beslemesi uygulanamaz.',
    });
  } else if (cpu.maxPowerWatts > motherboard.vrmMaxCpuWatts) {
    const msg = `VRM kapasitesi yetersiz: ${cpu.model} (maks. ${cpu.maxPowerWatts}W turbo yük), ${motherboard.model} anakartın ${motherboard.vrmMaxCpuWatts}W VRM besleme sınırını aşıyor ve performans kısılmasına yol açabilir.`;
    checks.push({
      id: 'vrm',
      title: 'Anakart VRM Kapasitesi',
      status: 'incompatible',
      message: msg,
    });
    warnings.push(msg);
  } else {
    checks.push({
      id: 'vrm',
      title: 'Anakart VRM Kapasitesi',
      status: 'verified',
      message: `Doğrulandı: Anakart VRM (${motherboard.vrmMaxCpuWatts}W), ${cpu.model} işlemcinin ${cpu.maxPowerWatts}W maksimum yükünü kararlı biçimde besler.`,
    });
  }

  // 9. PSU Watt Kapasitesi (Gerçekçi Maksimum Güç Tüketimi + Güvenli Pay)
  let realisticPeakDrawWatts: number | null = null;
  let recommendedPsuWatts: number | null = null;

  if (
    !cpu ||
    !gpu ||
    !psu ||
    cpu.maxPowerWatts === null ||
    gpu.peakPowerWatts === null ||
    psu.wattage === null
  ) {
    const msg =
      'CPU maksimum gücü, GPU tepe yükü veya PSU watt bilgisi eksik; güç kapasitesi doğrulanamadı.';
    checks.push({
      id: 'psu_watt',
      title: 'PSU Watt Kapasitesi (Maks. Yük + Pay)',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else {
    realisticPeakDrawWatts =
      cpu.maxPowerWatts + gpu.peakPowerWatts + SYSTEM_PEAK_OVERHEAD_WATTS;
    recommendedPsuWatts = Math.max(
      gpu.recommendedPsuWatts ?? 0,
      Math.ceil((realisticPeakDrawWatts * SAFE_PSU_HEADROOM_FACTOR) / 50) * 50
    );

    if (psu.wattage < realisticPeakDrawWatts) {
      const msg = `Yetersiz PSU watt kapasitesi: Gerçekçi maksimum sistem tüketimi (~${realisticPeakDrawWatts}W), seçili ${psu.wattage}W PSU sınırını aşıyor.`;
      checks.push({
        id: 'psu_watt',
        title: 'PSU Watt Kapasitesi (Maks. Yük + Pay)',
        status: 'incompatible',
        message: msg,
      });
      warnings.push(msg);
    } else if (psu.wattage < recommendedPsuWatts) {
      const msg = `Güvenli kapasite payı yetersiz: ~${realisticPeakDrawWatts}W gerçekçi tepe yük + %25 güvenli pay için en az ${recommendedPsuWatts}W PSU gerekir (seçili: ${psu.wattage}W).`;
      checks.push({
        id: 'psu_watt',
        title: 'PSU Watt Kapasitesi (Maks. Yük + Pay)',
        status: 'needs_verification',
        message: msg,
      });
      warnings.push(msg);
    } else {
      checks.push({
        id: 'psu_watt',
        title: 'PSU Watt Kapasitesi (Maks. Yük + Pay)',
        status: 'verified',
        message: `Doğrulandı: ${psu.wattage}W PSU, ~${realisticPeakDrawWatts}W gerçekçi tepe tüketim ve ${recommendedPsuWatts}W güvenli sınır için yeterli kapasite sunar.`,
      });
    }
  }

  // 10. PSU Güç Bağlantıları
  if (!gpu || !psu || !motherboard || gpu.requiredConnectors === null || psu.connectors === null) {
    const msg = 'GPU veya PSU güç konektörü verisi eksik; kablo uyumu doğrulanamadı.';
    checks.push({
      id: 'psu_connectors',
      title: 'PSU Güç Bağlantıları',
      status: 'needs_verification',
      message: msg,
    });
    warnings.push(msg);
  } else {
    const lacks8Pin =
      psu.connectors.pcie8PinCount < gpu.requiredConnectors.eightPinCount;
    const needsNative12Vhpwr = gpu.requiredConnectors.twelveVhpwrCount > 0;
    const hasNative12Vhpwr =
      psu.connectors.twelveVhpwrCount >= gpu.requiredConnectors.twelveVhpwrCount;
    const lacksEps = psu.connectors.eps8PinCount < motherboard.cpuEpsConnectors;

    if (lacks8Pin) {
      const msg = `PCIe kablosu eksik: GPU ${gpu.requiredConnectors.eightPinCount}x 8-Pin ister; PSU'da ${psu.connectors.pcie8PinCount}x bulunuyor.`;
      checks.push({
        id: 'psu_connectors',
        title: 'PSU Güç Bağlantıları',
        status: 'incompatible',
        message: msg,
      });
      warnings.push(msg);
    } else if (needsNative12Vhpwr && !hasNative12Vhpwr) {
      const msg = `12VHPWR kablo doğrulaması: GPU 16-Pin 12VHPWR ister; ${psu.atxStandard} PSU'da doğrudan çıkış yok (adaptör kablosu ve PCIe hat sayısı doğrulanmalıdır).`;
      checks.push({
        id: 'psu_connectors',
        title: 'PSU Güç Bağlantıları',
        status: 'needs_verification',
        message: msg,
      });
      warnings.push(msg);
    } else if (lacksEps) {
      const msg = `EPS CPU bağlantısı doğrulaması: Anakart ${motherboard.cpuEpsConnectors}x 8-Pin EPS içerir, PSU'da ${psu.connectors.eps8PinCount}x bulunuyor.`;
      checks.push({
        id: 'psu_connectors',
        title: 'PSU Güç Bağlantıları',
        status: 'needs_verification',
        message: msg,
      });
      warnings.push(msg);
    } else {
      checks.push({
        id: 'psu_connectors',
        title: 'PSU Güç Bağlantıları',
        status: 'verified',
        message: `Doğrulandı: PSU üzerindeki ${
          needsNative12Vhpwr
            ? 'doğrudan 12VHPWR'
            : gpu.requiredConnectors.eightPinCount > 0
              ? `${gpu.requiredConnectors.eightPinCount}x 8-Pin PCIe`
              : 'standart'
        } ve ${psu.connectors.eps8PinCount}x EPS bağlantıları donanım gereksinimlerini karşılar.`,
      });
    }
  }

  const verifiedCount = checks.filter((c) => c.status === 'verified').length;
  const needsVerificationCount = checks.filter(
    (c) => c.status === 'needs_verification'
  ).length;
  const incompatibleCount = checks.filter(
    (c) => c.status === 'incompatible'
  ).length;

  let overallStatus: CheckStatus = 'verified';
  if (incompatibleCount > 0) {
    overallStatus = 'incompatible';
  } else if (needsVerificationCount > 0) {
    overallStatus = 'needs_verification';
  }

  return {
    overallStatus,
    verifiedCount,
    needsVerificationCount,
    incompatibleCount,
    totalChecks: checks.length,
    realisticPeakDrawWatts,
    recommendedPsuWatts,
    checks,
    warnings,
  };
}
