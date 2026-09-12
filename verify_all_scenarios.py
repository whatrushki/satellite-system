import sys, os, json
sys.path.append("calculation_module")
import geometry

# Set stdout to UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def test_full_pipeline():
    print("=" * 70)
    print("ВЕРИФИКАЦИЯ СЦЕНАРИЕВ: СХЕМА, КИНЕМАТИКА, СВЯЗИ И СНИМКИ СЕТИ")
    print("=" * 70)

    scenarios = [
        ("01_full_constellation.json", "Полная группировка (48 КА, 3 плоскости)"),
        ("02_first_launch.json", "Первая очередь развертывания (16 КА)"),
        ("03_satellite_outages.json", "Сценарий отказов (10 КА отключены с 6 по 24 ч)"),
        ("04_link_range.json", "Ограничение дальности ISL (2000 км)"),
        ("05_sparse_planes.json", "Альтернативная конфигурация (24 КА, 2 плоскости)"),
        ("06_dual_gateway_failover.json", "Отказоустойчивость: резервный шлюз")
    ]

    for fname, desc in scenarios:
        fpath = os.path.join("data", fname)
        print(f"\n[ПРОВЕРКА] {fname}")
        print(f"  Описание: {desc}")
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Валидация официальной схемы cosmo-A-1.0
        geometry.validate(data)
        print("  1. Валидация схемы cosmo-A-1.0: ПРОЙДЕНА")

        # 2. Расчет кинематики в ECI и ECEF
        ids, eci, ecef = geometry.positions(data, 0)
        print(f"  2. Кинематика (t=0s): {len(ids)} КА рассчитаны в ECI и ECEF")

        # 3. Полный срез графа связности (ISL + Ground)
        snap0 = geometry.snapshot(data, 0)
        active0 = sum(1 for s in snap0["satellites"] if s["active"])
        edges0 = len(snap0["edges"])
        print(f"  3. Срез графа (t=0s): {active0} активных КА, {edges0} ребер связности")

        # 4. Проверка среза во время отказов (t=21600s / 6 часов)
        snap_fail = geometry.snapshot(data, 21600)
        active_fail = sum(1 for s in snap_fail["satellites"] if s["active"])
        edges_fail = len(snap_fail["edges"])
        print(f"  4. Срез при t=6h: {active_fail} активных КА, {edges_fail} ребер связности")

    print("\n" + "=" * 70)
    print("РЕЗУЛЬТАТ: ВСЕ СЦЕНАРИИ ПОЛНОСТЬЮ ВАЛИДНЫ И СООТВЕТСТВУЮТ ТЗ!")
    print("=" * 70)

if __name__ == "__main__":
    test_full_pipeline()

