package com.example.parksmart.repository;

import com.example.parksmart.entity.Booking;
import com.example.parksmart.entity.CheckInOut;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CheckInOutRepository extends JpaRepository<CheckInOut, Long> {

    Optional<CheckInOut> findByBooking(Booking booking);
}
