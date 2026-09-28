package com.example.parksmart.repository;

import com.example.parksmart.entity.ParkingLot;
import com.example.parksmart.entity.ParkingSlot;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    List<ParkingSlot> findByParkingLot(ParkingLot parkingLot);

    List<ParkingSlot> findByStatus(String status);
}
