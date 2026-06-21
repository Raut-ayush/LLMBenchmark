import psutil
import threading
import time
import csv
import subprocess


class HardwareMonitor:

    def __init__(self):

        self.running = False
        self.samples = []

    def get_gpu(self):

        try:

            result = subprocess.check_output(
                [
                    "nvidia-smi",
                    "--query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw",
                    "--format=csv,noheader,nounits"
                ]
            )

            gpu_util, gpu_mem, gpu_temp, gpu_power = (
                result.decode()
                .strip()
                .split(", ")
            )

            return {
                "gpu_util": float(gpu_util),
                "gpu_memory_mb": float(gpu_mem),
                "gpu_temp": float(gpu_temp),
                "gpu_power_w": float(gpu_power)
            }

        except Exception:

            return {
                "gpu_util": 0,
                "gpu_memory_mb": 0,
                "gpu_temp": 0,
                "gpu_power_w": 0
            }

    def sample(self):

        ram = psutil.virtual_memory()
        swap = psutil.swap_memory()

        data = {

            "timestamp": time.time(),

            "cpu_percent":
                psutil.cpu_percent(interval=0.1),

            "ram_percent":
                ram.percent,

            "ram_used_gb":
                round(
                    ram.used / 1024**3,
                    2
                ),

            "swap_used_gb":
                round(
                    swap.used / 1024**3,
                    2
                )
        }

        data.update(
            self.get_gpu()
        )

        self.samples.append(
            data
        )

    def monitor_loop(self):

        while self.running:

            self.sample()

            time.sleep(1)

    def start(self):

        self.running = True

        self.thread = threading.Thread(
            target=self.monitor_loop,
            daemon=True
        )

        self.thread.start()

    def stop(self):

        self.running = False

        self.thread.join()

    def save_csv(self, filename):

        if not self.samples:
            return

        with open(
            filename,
            "w",
            newline=""
        ) as f:

            writer = csv.DictWriter(
                f,
                fieldnames=self.samples[0].keys()
            )

            writer.writeheader()

            writer.writerows(
                self.samples
            )