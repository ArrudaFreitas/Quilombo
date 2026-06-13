package com.quilombo.media.dto;

/** Uso de quota da comunidade — alimenta a barra de armazenamento do painel. */
public record StorageUsageResponse(
        long usedBytes,
        long limitBytes,
        double usedMb,
        long limitMb,
        double percent) {

    private static final long ONE_MB = 1024L * 1024L;

    public static StorageUsageResponse of(long usedBytes, long limitBytes) {
        var usedMb = Math.round(usedBytes / (double) ONE_MB * 100) / 100.0;
        var percent = limitBytes == 0
                ? 0.0
                : Math.round((double) usedBytes / limitBytes * 1000) / 10.0;
        return new StorageUsageResponse(usedBytes, limitBytes, usedMb, limitBytes / ONE_MB, percent);
    }
}
