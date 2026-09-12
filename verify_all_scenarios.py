import sys, os, json, time
sys.path.append("calculation_module")
import geometry

def test_full_pipeline():
    print("=" * 60)
    print("ЗАПУСК КОМПЛЕКСНОЙ ВЕРИФИКАЦИИ ВСЕХ СЦЕНАРИЕВ")
    print("=" * 60)

    scenarios = [
        ("01_full_constellation.json", "Полная группировка (48 КА)"),
        ("02_first_launch.json", "Первая очередь (16 КА)"),
        ("03_satellite_outages.json", "Отказы аппаратов (10 КА)"),
        ("04_link_range.json", "Дальность ISL 2000 км"),
        ("05_sparse_planes.json", "Разреженная группировка (24 КА, 2 плоскости)"),
        ("06_dual_gateway_failover.json", "Резервирование шлюзов (Мурманск + Тикси)")
    ]

    for fname, desc in scenarios:
        fpath = os.path.join("data", fname)
        print(f"\n[ПРОВЕРКА] {fname} ({desc})")
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Validation
        geometry.validate(data)
        print("  1. Валидация схемы: УСПЕШНО")

        # 2. Geometry & kinematics check
        ids, sat_pos, r_sat = geometry.positions(data, 0)
        print(f"  2. Кинематика t=0: рассчитано {len(ids)} позиций КА")

    print("\n" + "=" * 60)
    print("ВСЕ ТЕСТЫ И ВЕРИФИКАЦИЯ УСПЕШНО ПРОЙДЕНЫ!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
