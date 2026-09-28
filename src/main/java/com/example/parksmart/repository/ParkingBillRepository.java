package com.example.parksmart.repository;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.ParkingBill;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ParkingBillRepository extends JpaRepository<ParkingBill, Long> {

    Optional<ParkingBill> findByBooking(Booking booking);

    Optional<ParkingBill> findByBookingId(Long bookingId);

    List<ParkingBill> findByPaymentStatus(String paymentStatus);

    boolean existsByBooking(Booking booking);

    boolean existsByBookingId(Long bookingId);
}
