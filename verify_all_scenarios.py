import sys, os, json, time
sys.path.append("backend")
import geometry
import app

def test_full_pipeline():
    print("=" * 60)
    print("ЗАПУСК КОМПЛЕКСНОЙ ВЕРИФИКАЦИИ ВСЕХ 4 СЦЕНАРИЕВ")
    print("=" * 60)

    scenarios = [
        ("01_full_constellation.json", "Полная группировка"),
        ("02_first_launch.json", "Первая очередь (16 КА)"),
        ("03_satellite_outages.json", "Отказы аппаратов (10 КА)"),
        ("04_link_range.json", "Дальность ISL 2000 км")
    ]

    for fname, desc in scenarios:
        fpath = os.path.join("Данные", fname)
        print(f"\n[ПРОВЕРКА] {fname} ({desc})")
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Validation
        geometry.validate(data)
        print("  1. Валидация схемы: УСПЕШНО")

        # 2. Simulation Benchmark
        t0 = time.time()
        sim_res = app.run_simulation(data)
        dt = time.time() - t0
        print(f"  2. Расчет 720 отсчетов: {dt:.2f} сек ({sim_res['total_steps']} шагов)")

        # 3. Metrics verification
        for c in sim_res["clients"]:
            status_target = "ДОСТИГНУТА" if c["target_met"] else "НЕ ДОСТИГНУТА"
            print(f"     * {c['client_id']} ({c['name']}): Доступность = {c['path_availability_pct']}%, Видимость = {c['visibility_pct']}%, Макс. перерыв = {c['max_gap_minutes']} мин [{status_target}]")

        # 4. Result Export check
        export_doc = app.export_results(data)
        assert export_doc["schema_version"] == "cosmo-A-result-1.0", "Неверная версия схемы результата"
        assert len(export_doc["routes"]) == 720 * len(sim_res["clients"]), f"Ожидалось {720 * len(sim_res['clients'])} маршрутов, получено {len(export_doc['routes'])}"
        print(f"  3. Экспорт cosmo-A-result-1.0: {len(export_doc['routes'])} маршрутов сформировано корректно")

    print("\n" + "=" * 60)
    print("ВСЕ ТЕСТЫ И ВЕРИФИКАЦИЯ УСПЕШНО ПРОЙДЕНЫ!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
