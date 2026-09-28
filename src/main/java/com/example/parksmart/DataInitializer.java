package com.example.parksmart;

import com.example.parksmart.entity.ParkingLot;
import com.example.parksmart.entity.ParkingSlot;
import com.example.parksmart.repository.ParkingLotRepository;
import com.example.parksmart.repository.ParkingSlotRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(ParkingLotRepository parkingLotRepository,
                              ParkingSlotRepository parkingSlotRepository) {
        return args -> {
            if (parkingLotRepository.count() > 0) {
                return;
            }

            ParkingLot parkingLot = new ParkingLot();
            parkingLot.setName("City Center Parking");
            parkingLot.setLocation("Coimbatore");
            parkingLot.setTotalSlots(20);
            parkingLot = parkingLotRepository.save(parkingLot);

            List<String> slotNumbers = List.of("A1", "A2", "A3", "A4", "A5");
            for (String slotNumber : slotNumbers) {
                ParkingSlot parkingSlot = new ParkingSlot();
                parkingSlot.setSlotNumber(slotNumber);
                parkingSlot.setVehicleType("CAR");
                parkingSlot.setStatus("AVAILABLE");
                parkingSlot.setParkingLot(parkingLot);
                parkingSlotRepository.save(parkingSlot);
            }
        };
    }
}
