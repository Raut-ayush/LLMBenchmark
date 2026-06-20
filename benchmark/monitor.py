import psutil
import subprocess
import time

try:
    from pynvml import *
    nvmlInit()
    GPU_AVAILABLE = True
except:
    GPU_AVAILABLE = False


def get_gpu_info():

    if not GPU_AVAILABLE:
        return {
            "gpu_util": 0,
            "gpu_memory_mb": 0,
            "gpu_temp": 0
        }

    handle = nvmlDeviceGetHandleByIndex(0)

    util = nvmlDeviceGetUtilizationRates(handle)

    mem = nvmlDeviceGetMemoryInfo(handle)

    temp = nvmlDeviceGetTemperature(
        handle,
        NVML_TEMPERATURE_GPU
    )

    return {
        "gpu_util": util.gpu,
        "gpu_memory_mb":
            round(mem.used / 1024 / 1024, 2),
        "gpu_temp": temp
    }


def get_system_info():

    ram = psutil.virtual_memory()

    cpu = psutil.cpu_percent(interval=1)

    gpu = get_gpu_info()

    return {
        "cpu_percent": cpu,
        "ram_percent": ram.percent,
        "ram_used_gb":
            round(
                ram.used / 1024**3,
                2
            ),

        **gpu
    }