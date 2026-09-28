package com.example.parksmart.repository;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.ParkingSlot;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByParkingSlot(ParkingSlot parkingSlot);

    List<Booking> findByVehicleNumber(String vehicleNumber);

    @Query("SELECT b FROM Booking b WHERE b.parkingSlot = :parkingSlot AND b.status <> 'CANCELLED' " +
            "AND b.startTime < :requestedEndTime AND b.endTime > :requestedStartTime")
    List<Booking> findOverlappingBookings(@Param("parkingSlot") ParkingSlot parkingSlot,
                                         @Param("requestedStartTime") LocalDateTime requestedStartTime,
                                         @Param("requestedEndTime") LocalDateTime requestedEndTime);

    @Query("SELECT b FROM Booking b WHERE b.startTime >= :startTime AND b.endTime <= :endTime")
    List<Booking> findByStartTimeBetweenEndTime(@Param("startTime") LocalDateTime startTime,
                                                @Param("endTime") LocalDateTime endTime);
}
